import { emailQueue, imageQueue, reportQueue } from "../queues/index.js";
import { createHash } from "node:crypto";
import Job from "../models/Job.js";

const queuesByType = {
  image: imageQueue,
  report: reportQueue,
  email: emailQueue,
};

// Priority convention: 1 = critical, 5 = high, 10 = normal (default), 20 = low.
export async function submitJob(type, payload, options = {}) {
  const queue = queuesByType[type];

  if (!queue) {
    throw new Error(`Unknown job type: ${type}`);
  }

  // Determine jobId: use provided one or generate deterministic id from type+payload
  const jobId = options.jobId
    ? options.jobId
    : createHash("sha256")
        .update(JSON.stringify({ type, payload }))
        .digest("hex")
        .slice(0, 16);

  // Ensure a Job document exists before adding to BullMQ. Use $setOnInsert
  // to avoid overwriting submittedAt on retries.
  const priority = options.priority ?? 10;
  const attempts = options.attempts;
  const backoff = options.backoff;

  const existingJob = await Job.findOne({ jobId }).lean().exec();

  await Job.findOneAndUpdate(
    { jobId },
    {
      $setOnInsert: {
        jobId,
        type,
        payload,
        priority,
        status: "waiting",
        submittedAt: new Date(),
      },
    },
    { upsert: true, new: true },
  );

  // Pass jobId to BullMQ. BullMQ will silently ignore duplicate submissions
  // with the same jobId.
  const job = await queue.add(type, payload, {
    priority,
    delay: options.delay ?? 0,
    jobId,
    ...(attempts !== undefined ? { attempts } : {}),
    ...(backoff !== undefined ? { backoff } : {}),
  });

  const isDuplicate = Boolean(existingJob);

  return { job, isDuplicate };
}
