import { QueueEvents } from "bullmq";
import Job from "../models/Job.js";
import { redisSubscriber } from "../config/redis.js";

let started = false;

function attachListeners(queueName) {
  const qe = new QueueEvents(queueName, { connection: redisSubscriber });

  qe.on("waiting", async (event) => {
    const { jobId } = event;
    try {
      await Job.findOneAndUpdate(
        { jobId },
        {
          $set: { status: "waiting" },
          $setOnInsert: { submittedAt: new Date() },
        },
        { upsert: true, new: true },
      );
      console.log(`[sync] job ${jobId} → waiting`);
    } catch (err) {
      console.error(
        `[sync] waiting handler error for ${jobId}: ${err.message}`,
      );
    }
  });

  qe.on("active", async (event) => {
    const { jobId } = event;
    try {
      await Job.findOneAndUpdate(
        { jobId },
        {
          $set: { status: "active", startedAt: new Date() },
          $inc: { attempts: 1 },
        },
        { new: true },
      );
      console.log(`[sync] job ${jobId} → active`);
    } catch (err) {
      console.error(`[sync] active handler error for ${jobId}: ${err.message}`);
    }
  });

  qe.on("completed", async (event) => {
    const { jobId, returnvalue } = event;
    try {
      await Job.findOneAndUpdate(
        { jobId },
        {
          $set: {
            status: "completed",
            result: returnvalue,
            completedAt: new Date(),
          },
        },
        { new: true },
      );
      console.log(`[sync] job ${jobId} → completed`);
    } catch (err) {
      console.error(
        `[sync] completed handler error for ${jobId}: ${err.message}`,
      );
    }
  });

  qe.on("failed", async (event) => {
    const { jobId, failedReason } = event;
    try {
      await Job.findOneAndUpdate(
        { jobId },
        {
          $set: {
            status: "failed",
            failReason: failedReason,
            completedAt: new Date(),
          },
        },
        { new: true },
      );
      console.log(`[sync] job ${jobId} → failed`);
    } catch (err) {
      console.error(`[sync] failed handler error for ${jobId}: ${err.message}`);
    }
  });

  return qe;
}

export function startJobSync() {
  if (started) return;
  started = true;

  // Attach to the three queues by their queue names
  const qImage = attachListeners("image-processing");
  const qReport = attachListeners("report-generation");
  const qEmail = attachListeners("email-dispatch");

  return { qImage, qReport, qEmail };
}
