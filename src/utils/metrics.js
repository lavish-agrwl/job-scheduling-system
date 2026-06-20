import client from "prom-client";
import {
  imageQueue,
  reportQueue,
  emailQueue,
  deadLetterQueue,
} from "../queues/index.js";

const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics();

export const register = client.register;

export const jobsSubmittedTotal = new client.Counter({
  name: "jobs_submitted_total",
  help: "Total number of jobs submitted",
  labelNames: ["type"],
});

export const jobsCompletedTotal = new client.Counter({
  name: "jobs_completed_total",
  help: "Total number of jobs completed",
  labelNames: ["type"],
});

export const jobsFailedTotal = new client.Counter({
  name: "jobs_failed_total",
  help: "Total number of jobs failed",
  labelNames: ["type", "finalAttempt"],
});

export const jobDurationSeconds = new client.Histogram({
  name: "job_duration_seconds",
  help: "Job duration in seconds",
  labelNames: ["type"],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
});

export const queueDepth = new client.Gauge({
  name: "queue_depth",
  help: "Queue depth (waiting + active)",
  labelNames: ["queue"],
});

export async function updateQueueDepthMetrics() {
  const queues = [imageQueue, reportQueue, emailQueue, deadLetterQueue];

  for (const q of queues) {
    try {
      const waiting = await q.getWaitingCount();
      const active = await q.getActiveCount();
      const depth = (waiting ?? 0) + (active ?? 0);
      const name = q.name || "unknown";
      queueDepth.set({ queue: name }, depth);
    } catch (err) {
      // don't throw; metric update should be best-effort
      console.error(
        `metrics: failed to update depth for queue ${q.name}: ${err.message}`,
      );
    }
  }
}

export default {
  register,
  jobsSubmittedTotal,
  jobsCompletedTotal,
  jobsFailedTotal,
  jobDurationSeconds,
  queueDepth,
  updateQueueDepthMetrics,
};
