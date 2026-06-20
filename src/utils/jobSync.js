import { QueueEvents, Job as BullJob } from "bullmq";
import Job from "../models/Job.js";
import { redisSubscriber } from "../config/redis.js";
import {
  jobsSubmittedTotal,
  jobsCompletedTotal,
  jobsFailedTotal,
} from "./metrics.js";
import { imageQueue, reportQueue, emailQueue } from "../queues/index.js";

let started = false;

function attachListeners(queue, type) {
  const qe = new QueueEvents(queue.name, { connection: redisSubscriber });

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
      jobsSubmittedTotal.inc({ type });
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
      jobsCompletedTotal.inc({ type });
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
      // Determine if this was the final attempt by inspecting the Bull job
      let finalAttempt = false;
      try {
        const bullJob = await BullJob.fromId(queue, jobId);
        if (bullJob) {
          const attemptsMade = bullJob.attemptsMade ?? 0;
          const optsAttempts = (bullJob.opts && bullJob.opts.attempts) ?? null;
          if (optsAttempts != null) finalAttempt = attemptsMade >= optsAttempts;
        }
      } catch (e) {
        // best-effort: if we can't fetch bull job, leave finalAttempt=false
      }

      jobsFailedTotal.inc({
        type,
        finalAttempt: finalAttempt ? "true" : "false",
      });
      console.log(
        `[sync] job ${jobId} → failed (finalAttempt=${finalAttempt})`,
      );
    } catch (err) {
      console.error(`[sync] failed handler error for ${jobId}: ${err.message}`);
    }
  });

  return qe;
}

export function startJobSync() {
  if (started) return;
  started = true;

  // Attach to the three queues with their types
  const qImage = attachListeners(imageQueue, "image");
  const qReport = attachListeners(reportQueue, "report");
  const qEmail = attachListeners(emailQueue, "email");

  return { qImage, qReport, qEmail };
}
