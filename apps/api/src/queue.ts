import { Queue, Worker } from "bullmq";
import Redis from "ioredis";
import dotenv from "dotenv";
import axios from "axios"; 

dotenv.config();

// DOCKER UPDATE: Use environment variables for host/port so Docker can route to the "redis" container
const redisHost = process.env.REDIS_HOST || "127.0.0.1";
const redisPort = process.env.REDIS_PORT || "6379";
const redisUrl = process.env.REDIS_URL || `redis://${redisHost}:${redisPort}`;

const redisConnection = new Redis(
  redisUrl,
  {
    maxRetriesPerRequest: null,
    family: 0,
    tls: redisUrl.includes("rediss://")
      ? { rejectUnauthorized: false }
      : undefined,
  },
);

// 1. Queue Definition
export const analysisQueue = new Queue("AnalysisQueue", {
  connection: redisConnection as any,
});

// 2. Worker Definition (Day 3 & 5 Optimized)
export const analysisWorker = new Worker(
  "AnalysisQueue",
  async (job) => {
    const { tenant_id, data_source } = job.data;

    console.log(
      `[Worker] ⚙️ Processing Job ${job.id} for Tenant: ${tenant_id || "default_tenant"}`,
    );

    try {
      // DOCKER UPDATE: Route to the Docker network name "engine" instead of localhost
      const engineUrl = process.env.ENGINE_URL || "http://127.0.0.1:8000";
      
      // We use a 5-minute timeout because PySpark + RAG can take time on cold starts
      const response = await axios.post(`${engineUrl}/analyze`,
        {
          data_source: job.data.data_source,
          csv_content: job.data.csv_content,
          tenant_id: job.data.tenant_id || "default_tenant" // <--- CRITICAL FIX: Explicitly forwarding Tenant ID to Python
        },
        {
          headers: { "Content-Type": "application/json" },
          timeout: 300000,
          
        },
      );

      console.log(
        `[Worker] 📥 Python Engine returned results for Job ${job.id}`,
      );
      return response.data;
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || error.message;
      console.error(`[Worker] ❌ Python Analysis Error: ${errorMsg}`);

      // This allows BullMQ to track the failure and potentially retry
      throw new Error(`Python analysis failed: ${errorMsg}`);
    }
  },
  {
    connection: redisConnection as any,
    concurrency: 5, // Allow 5 parallel jobs for better scalability
  },
);

// 3. Event Listeners
analysisWorker.on("completed", (job) => {
  console.log(
    `[Worker] ✅ Job ${job.id} (Tenant: ${job.data.tenant_id || "default_tenant"}) completed successfully.`,
  );
});

analysisWorker.on("failed", (job, err) => {
  console.error(`[Worker] ❌ Job ${job?.id} failed: ${err.message}`);
});