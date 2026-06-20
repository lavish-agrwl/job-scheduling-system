import { emailQueue, imageQueue, reportQueue } from "../queues/index.js";
import { createHash } from "node:crypto";

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

  // Pass jobId to BullMQ. BullMQ will silently ignore duplicate submissions
  // with the same jobId (it returns null when the job already exists).
  const job = await queue.add(type, payload, {
    priority: options.priority ?? 10,
    delay: options.delay ?? 0,
    jobId,
  });

  const isDuplicate = !job || !job.id;

  return { job, isDuplicate };
}
