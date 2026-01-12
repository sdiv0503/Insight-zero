import dotenv from "dotenv";
dotenv.config();

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
  }
);

// 3. File Upload Route (PROTECTED)
app.post(
  "/upload-analysis",
  ClerkExpressRequireAuth() as unknown as RequestHandler,
  upload.single("dataset"), // Expect a file field named "dataset"
  async (req: Request, res: Response) => {
    try {
      if (!req.file) return res.status(400).json({ error: "No file uploaded" });

      // 1. Convert Buffer to String
      const csvContent = req.file.buffer.toString("utf-8");
      const dataSourceName = req.file.originalname;

      console.log(`[API] 📂 Received File: ${dataSourceName}`);

      // 2. Send CSV Content to Python
      const pythonRes = await axios.post("http://127.0.0.1:8000/analyze", {
        data_source: dataSourceName,
        csv_content: csvContent,
      });
      const insight = pythonRes.data;

      // 3. Save to DB
      const savedReport = await prisma.analysisReport.create({
        data: {
          dataSource: dataSourceName,
          summary: insight.summary,
          anomalyCount: insight.anomalies_found,
          rawJson: insight,
        },
      });

      res.json({
        message: "File Analyzed",
        reportId: savedReport.id,
        insight: insight,
      });
    } catch (error: any) {
      console.error("Upload Failed", error.message);
      res.status(500).json({ error: error.message });
    }
  }
);

// 6. LIVE DB CONNECTION ROUTE
app.post('/connect-db-analysis', 
  ClerkExpressRequireAuth() as unknown as RequestHandler, 
  async (req: Request, res: Response) => {
    try {
        const { connection_string, query } = req.body;
        
        if (!connection_string || !query) {
            return res.status(400).json({ error: "Missing connection details" });
        }

        console.log(`[API] 🔗 Connecting to Remote DB...`);

        // Forward credentials to Python (Python acts as the bridge)
        const pythonRes = await axios.post('http://127.0.0.1:8000/analyze', {
            data_source: "postgres_live",
            db_connection_str: connection_string,
            db_query: query
        });
        const insight = pythonRes.data;

        // Save Record
        const savedReport = await prisma.analysisReport.create({
            data: {
                dataSource: "Live Database Connection",
                summary: insight.summary,
                anomalyCount: insight.anomalies_found,
                rawJson: insight
            }
        });

        res.json({ 
            message: "DB Analyzed", 
            reportId: savedReport.id, 
            insight: insight 
        });

    } catch (error: any) {
        console.error("DB Connection Failed", error.message);
        res.status(500).json({ error: error.message });
    }
});

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
  }
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
