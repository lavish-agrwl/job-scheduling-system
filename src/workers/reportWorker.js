import { Worker } from "bullmq";

import { redisConnection } from "../config/redis.js";
import reportProcessor from "../processors/reportProcessor.js";
import { setupGracefulShutdown } from "../utils/gracefulShutdown.js";

const reportWorker = new Worker("report-generation", reportProcessor, {
  concurrency: 1,
  connection: redisConnection,
  // If a worker crashes while processing, Redis lock expires after lockDuration ms.
  // BullMQ then re-queues the job. Without this, crashed jobs stay in 'active' state forever.
  lockDuration: 30000,
  stalledInterval: 15000,
  maxStalledCount: 2,
});

setupGracefulShutdown(reportWorker, "report-generation");

reportWorker.on("completed", (job, returnvalue) => {
  console.log(`[report] Worker completed job ${job.id}:`, returnvalue);
});

reportWorker.on("failed", (job, error) => {
  console.error(`[report] Worker failed job ${job?.id}: ${error.message}`);
});

reportWorker.on("stalled", (jobId) => {
  console.warn(`[report-generation] Job ${jobId} stalled — will be re-queued`);
});

console.log("Report worker started");

export default reportWorker;
