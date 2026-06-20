import { Worker } from "bullmq";

import { redisConnection } from "../config/redis.js";
import imageProcessor from "../processors/imageProcessor.js";

const imageWorker = new Worker("image-processing", imageProcessor, {
  concurrency: 2,
  connection: redisConnection,
});

imageWorker.on("completed", (job, returnvalue) => {
  console.log(`[image] Worker completed job ${job.id}:`, returnvalue);
});

imageWorker.on("failed", (job, error) => {
  console.error(`[image] Worker failed job ${job?.id}: ${error.message}`);
});

console.log("Image worker started");

export default imageWorker;
