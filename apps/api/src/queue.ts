import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';
import dotenv from 'dotenv';
dotenv.config();

const redisConnection = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
  maxRetriesPerRequest: null,
  family: 0, // Forces IPv4 / IPv6 resolution to prevent TLS drops
  tls: { rejectUnauthorized: false } // Required for stable Upstash serverless connections
});

// FIXED: Cast connection to 'any' to resolve ioredis version strict-typing mismatch
export const analysisQueue = new Queue('AnalysisQueue', { connection: redisConnection as any });

export const analysisWorker = new Worker('AnalysisQueue', async (job) => {
    console.log(`[Worker] ⚙️ Processing Job ${job.id}`);
    
    const pythonRes = await fetch('http://127.0.0.1:8000/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(job.data)
    });

    if (!pythonRes.ok) throw new Error("Python analysis failed");
    return await pythonRes.json();
    
}, { connection: redisConnection as any });

analysisWorker.on('completed', (job) => {
    console.log(`[Worker] ✅ Job ${job.id} completed successfully.`);
});
analysisWorker.on('failed', (job, err) => {
    console.log(`[Worker] ❌ Job ${job?.id} failed: ${err.message}`);
});