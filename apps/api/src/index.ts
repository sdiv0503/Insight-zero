import dotenv from "dotenv";
dotenv.config();

import { analysisQueue } from "./queue";
import swaggerUi from 'swagger-ui-express';

import express, {
  Request,
  Response,
  NextFunction,
  RequestHandler,
} from "express";
import cors from "cors";
import axios from "axios";
import { ClerkExpressRequireAuth } from "@clerk/clerk-sdk-node";
import multer from "multer";
import { prisma } from "./db";
// -----------------------------------

const upload = multer({ storage: multer.memoryStorage() }); // Store file in RAM temporarily

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const swaggerDocument = {
  openapi: "3.0.0",
  info: {
    title: "Insight-Zero Orchestration Gateway",
    version: "1.0.0",
    description: "The secure Node.js Gateway API handling Auth, Redis Queues, and Python forwarding."
  },
  paths: {
    "/upload-analysis": {
      post: {
        summary: "Upload a CSV dataset for analysis",
        description: "Adds the dataset to the BullMQ Redis queue.",
        responses: { "200": { description: "Job Queued successfully" } }
      }
    },
    "/job-status/{id}": {
      get: {
        summary: "Poll Analysis Status",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Returns 'waiting', 'active', or 'completed' with results" } }
      }
    }
  }
};
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// 1. Health Check (Public)
app.get("/", (req, res) => {
  res.json({ message: "Insight-Zero Orchestrator is Online 🟢" });
});

// 2. The Bridge (PROTECTED) - Standard Analysis
app.post(
  "/start-analysis",
  ClerkExpressRequireAuth() as unknown as RequestHandler,
  async (req: Request, res: Response) => {
    try {
      console.log("Authenticated User Request Received");
      const { data_source } = req.body;

      // Send a request to the Python Engine
      const response = await axios.post("http://127.0.0.1:8000/analyze", {
        data_source: data_source,
      });
      const insight = response.data;

      // Save to DB
      const savedReport = await prisma.analysisReport.create({
        data: {
          dataSource: data_source,
          summary: insight.summary,
          anomalyCount: insight.anomalies_found,
          rawJson: insight,
        },
      });

      res.json({
        message: "Analysis Complete",
        reportId: savedReport.id,
        insight: insight,
      });
    } catch (error) {
      console.error("Python Engine is down or busy");
      res.status(500).json({ error: "Failed to contact Analyst Engine" });
    }
  },
);

app.post(
  "/upload-analysis",
  ClerkExpressRequireAuth() as unknown as RequestHandler,
  upload.single("file"),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) return res.status(400).json({ error: "No file uploaded" });

      const csvContent = req.file.buffer.toString("utf-8");

      // Add to Redis Queue instead of waiting
      const job = await analysisQueue.add("analyze-csv", {
        data_source: req.file.originalname,
        csv_content: csvContent,
      });

      res.json({ jobId: job.id, message: "Analysis Queued" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// --- NEW: JOB STATUS POLLING ROUTE ---
app.get(
  "/job-status/:id",
  ClerkExpressRequireAuth() as unknown as RequestHandler,
  async (req: Request, res: Response) => {
    try {
      const job = await analysisQueue.getJob(req.params.id as string);
      if (!job) return res.status(404).json({ error: "Job not found" });

      const state = await job.getState(); // 'waiting', 'active', 'completed', 'failed'
      res.json({
        id: job.id,
        state: state,
        result: job.returnvalue, // This holds the python JSON when completed
        error: job.failedReason,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// 6. LIVE DB CONNECTION ROUTE
app.post(
  "/connect-db-analysis",
  ClerkExpressRequireAuth() as unknown as RequestHandler,
  async (req: Request, res: Response) => {
    try {
      const { connection_string, query } = req.body;

      if (!connection_string || !query) {
        return res.status(400).json({ error: "Missing connection details" });
      }

      console.log(`[API] 🔗 Connecting to Remote DB...`);

      // Forward credentials to Python (Python acts as the bridge)
      const pythonRes = await axios.post("http://127.0.0.1:8000/analyze", {
        data_source: "postgres_live",
        db_connection_str: connection_string,
        db_query: query,
      });
      const insight = pythonRes.data;

      // Save Record
      const savedReport = await prisma.analysisReport.create({
        data: {
          dataSource: "Live Database Connection",
          summary: insight.summary,
          anomalyCount: insight.anomalies_found,
          rawJson: insight,
        },
      });

      res.json({
        message: "DB Analyzed",
        reportId: savedReport.id,
        insight: insight,
      });
    } catch (error: any) {
      console.error("DB Connection Failed", error.message);
      res.status(500).json({ error: error.message });
    }
  },
);

// 7. NEW: KNOWLEDGE BASE UPLOAD ROUTE
app.post(
  "/upload-context",
  ClerkExpressRequireAuth() as unknown as RequestHandler,
  upload.single("document"),
  async (req: Request, res: Response) => {
    try {
      if (!req.file)
        return res.status(400).json({ error: "No document uploaded" });

      console.log(
        `[API] 📚 Sending PDF to Vector DB: ${req.file.originalname}`,
      );

      // We must send the file buffer to Python as form-data
      const formData = new FormData();
      const blob = new Blob([new Uint8Array(req.file.buffer)], {
        type: "application/pdf",
      });
      formData.append("file", blob, req.file.originalname);

      const pythonRes = await fetch("http://127.0.0.1:8000/upload-context", {
        method: "POST",
        body: formData,
      });

      if (!pythonRes.ok) throw new Error("Python RAG ingestion failed");

      const result = await pythonRes.json();
      res.json({ message: "Knowledge Base Updated", details: result });
    } catch (error: any) {
      console.error("Context Upload Failed", error.message);
      res.status(500).json({ error: error.message });
    }
  },
);

// 8. NEW: GENERATE PPTX SLIDE ROUTE
app.post(
  "/export-slide",
  ClerkExpressRequireAuth() as unknown as RequestHandler,
  async (req: Request, res: Response) => {
    try {
      const { anomaly_date, revenue, confidence, root_cause } = req.body;

      console.log(`[API] 📊 Generating Executive Slide for ${anomaly_date}`);

      const pythonRes = await fetch("http://127.0.0.1:8000/export-slide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anomaly_date, revenue, confidence, root_cause }),
      });

      if (!pythonRes.ok)
        throw new Error("Failed to generate slide in Python Engine");

      const result = await pythonRes.json();
      // Result contains { filename, data: base64_string }
      res.json(result);
    } catch (error: any) {
      console.error("Slide Generation Failed", error.message);
      res.status(500).json({ error: error.message });
    }
  },
);

// 4. Fetch History Route (Optional but good to have)
app.get(
  "/reports",
  ClerkExpressRequireAuth() as unknown as RequestHandler,
  async (req: Request, res: Response) => {
    try {
      const reports = await prisma.analysisReport.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
      });
      res.json(reports);
    } catch (error: any) {
      res
        .status(500)
        .json({ error: "Failed to fetch reports", details: error.message });
    }
  },
);

// Error handler for auth failures
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("🔥 GLOBAL ERROR:", err.message);
  if (err.message === "Unauthenticated") {
    res.status(401).json({ error: "You must be logged in to do this." });
  } else {
    res
      .status(500)
      .json({ error: "Internal Server Error", details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Orchestrator running on http://localhost:${PORT}`);
});
