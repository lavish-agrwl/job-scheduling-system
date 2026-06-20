import { Worker } from "bullmq";

import { redisConnection } from "../config/redis.js";
import emailProcessor from "../processors/emailProcessor.js";
import { setupGracefulShutdown } from "../utils/gracefulShutdown.js";

const emailWorker = new Worker("email-dispatch", emailProcessor, {
  concurrency: 5,
  connection: redisConnection,
});

setupGracefulShutdown(emailWorker, "email-dispatch");

emailWorker.on("completed", (job, returnvalue) => {
  console.log(`[email] Worker completed job ${job.id}:`, returnvalue);
});

emailWorker.on("failed", (job, error) => {
  console.error(`[email] Worker failed job ${job?.id}: ${error.message}`);
});

console.log("Email worker started");

export default emailWorker;
