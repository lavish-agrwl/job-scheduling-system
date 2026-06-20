import { setTimeout as delay } from "node:timers/promises";

export default async function reportProcessor(job) {
  console.log(
    `[report] Processing job ${job.id} with data: ${JSON.stringify(job.data)}`,
  );

  await delay(4000);

  console.log(`[report] Job ${job.id} completed`);

  return {
    status: "done",
    reportId: job.id,
    generatedAt: new Date().toISOString(),
  };
}
