import { setTimeout as delay } from "node:timers/promises";
import { jobDurationSeconds } from "../utils/metrics.js";

export default async function imageProcessor(job) {
  const end = jobDurationSeconds.startTimer({ type: "image" });

  console.log(
    `[image] Processing job ${job.id} with data: ${JSON.stringify(job.data)}`,
  );

  await delay(2000);

  if (job.data.shouldFail === true) {
    end();
    throw new Error("Simulated failure");
  }

  console.log(`[image] Job ${job.id} completed`);

  end();
  return { status: "done", jobId: job.id };
}
