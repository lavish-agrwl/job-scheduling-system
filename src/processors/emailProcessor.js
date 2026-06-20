import { setTimeout as delay } from "node:timers/promises";
import { jobDurationSeconds } from "../utils/metrics.js";

export default async function emailProcessor(job) {
  const end = jobDurationSeconds.startTimer({ type: "email" });

  console.log(
    `[email] Processing job ${job.id} with data: ${JSON.stringify(job.data)}`,
  );

  await delay(500);

  if (!job.data.to) {
    end();
    throw new Error("Missing recipient email");
  }

  console.log(`[email] Job ${job.id} completed`);

  end();
  return { status: "sent", to: job.data.to, jobId: job.id };
}
