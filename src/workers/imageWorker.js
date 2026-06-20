import { Worker } from "bullmq";

import { redisConnection } from "../config/redis.js";
import imageProcessor from "../processors/imageProcessor.js";
import { setupGracefulShutdown } from "../utils/gracefulShutdown.js";

const imageWorker = new Worker("image-processing", imageProcessor, {
  concurrency: 2,
  connection: redisConnection,
  // If a worker crashes while processing, Redis lock expires after lockDuration ms.
  // BullMQ then re-queues the job. Without this, crashed jobs stay in 'active' state forever.
  lockDuration: 30000,
  stalledInterval: 15000,
  maxStalledCount: 2,
});

setupGracefulShutdown(imageWorker, "image-processing");

imageWorker.on("completed", (job, returnvalue) => {
  console.log(`[image] Worker completed job ${job.id}:`, returnvalue);
});

imageWorker.on("failed", (job, error) => {
  console.error(`[image] Worker failed job ${job?.id}: ${error.message}`);
});

imageWorker.on("stalled", (jobId) => {
  console.warn(`[image-processing] Job ${jobId} stalled — will be re-queued`);
});

console.log("Image worker started");

export default imageWorker;
