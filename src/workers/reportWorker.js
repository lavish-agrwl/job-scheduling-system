import { Worker } from "bullmq";

import { redisConnection } from "../config/redis.js";
import reportProcessor from "../processors/reportProcessor.js";

const reportWorker = new Worker("report-generation", reportProcessor, {
  concurrency: 1,
  connection: redisConnection,
});

reportWorker.on("completed", (job, returnvalue) => {
  console.log(`[report] Worker completed job ${job.id}:`, returnvalue);
});

reportWorker.on("failed", (job, error) => {
  console.error(`[report] Worker failed job ${job?.id}: ${error.message}`);
});

console.log("Report worker started");

export default reportWorker;
