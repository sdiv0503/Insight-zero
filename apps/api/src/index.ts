import express, {
  Request,
  Response,
  NextFunction,
  RequestHandler,
} from "express"; // Added types
import cors from "cors";
import axios from "axios";
import { ClerkExpressRequireAuth } from "@clerk/clerk-sdk-node";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// 1. Health Check (Public)
app.get("/", (req, res) => {
  res.json({ message: "Insight-Zero Orchestrator is Online 🟢" });
});

// 2. The Bridge (PROTECTED)
// We add 'ClerkExpressRequireAuth()' as middleware.
// If the user isn't logged in, this function blocks them here.
app.post(
  "/start-analysis",
  ClerkExpressRequireAuth() as unknown as RequestHandler,
  async (req: Request, res: Response) => {
    try {
      console.log("Authenticated User Request Received");

      // Send a request to the Python Engine
      const response = await axios.post("http://127.0.0.1:8000/analyze", {
        data_source: req.body.data_source,
      });

      res.json({
        message: "Analysis Complete",
        insight: response.data,
      });
    } catch (error) {
      console.error("Python Engine is down or busy");
      res.status(500).json({ error: "Failed to contact Analyst Engine" });
    }
  }
);

// Error handler for auth failures
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (err.message === "Unauthenticated") {
    res.status(401).json({ error: "You must be logged in to do this." });
  } else {
    next(err);
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Orchestrator running on http://localhost:${PORT}`);
});
