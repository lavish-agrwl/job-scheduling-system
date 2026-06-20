import { setTimeout as delay } from "node:timers/promises";

export default async function imageProcessor(job) {
  console.log(
    `[image] Processing job ${job.id} with data: ${JSON.stringify(job.data)}`,
  );

  await delay(2000);

  if (job.data.shouldFail === true) {
    throw new Error("Simulated failure");
  }

  console.log(`[image] Job ${job.id} completed`);

  return { status: "done", jobId: job.id };
}
