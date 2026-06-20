import { Worker } from "bullmq";

import { redisConnection } from "../config/redis.js";
import emailProcessor from "../processors/emailProcessor.js";
import { setupGracefulShutdown } from "../utils/gracefulShutdown.js";

const emailWorker = new Worker("email-dispatch", emailProcessor, {
  concurrency: 5,
  connection: redisConnection,
  // If a worker crashes while processing, Redis lock expires after lockDuration ms.
  // BullMQ then re-queues the job. Without this, crashed jobs stay in 'active' state forever.
  lockDuration: 30000,
  stalledInterval: 15000,
  maxStalledCount: 2,
});

setupGracefulShutdown(emailWorker, "email-dispatch");

emailWorker.on("completed", (job, returnvalue) => {
  console.log(`[email] Worker completed job ${job.id}:`, returnvalue);
});

emailWorker.on("failed", (job, error) => {
  console.error(`[email] Worker failed job ${job?.id}: ${error.message}`);
});

emailWorker.on("stalled", (jobId) => {
  console.warn(`[email-dispatch] Job ${jobId} stalled — will be re-queued`);
});

console.log("Email worker started");

export default emailWorker;
