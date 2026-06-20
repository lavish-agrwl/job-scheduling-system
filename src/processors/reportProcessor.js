import { setTimeout as delay } from "node:timers/promises";
import { jobDurationSeconds } from "../utils/metrics.js";

export default async function reportProcessor(job) {
  const end = jobDurationSeconds.startTimer({ type: "report" });

  console.log(
    `[report] Processing job ${job.id} with data: ${JSON.stringify(job.data)}`,
  );

  await delay(4000);

  console.log(`[report] Job ${job.id} completed`);

  end();
  return {
    status: "done",
    reportId: job.id,
    generatedAt: new Date().toISOString(),
  };
}
