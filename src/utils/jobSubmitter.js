import { emailQueue, imageQueue, reportQueue } from "../queues/index.js";

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

  return queue.add(type, payload, {
    priority: options.priority ?? 10,
    delay: options.delay ?? 0,
    jobId: options.jobId ?? undefined,
  });
}
