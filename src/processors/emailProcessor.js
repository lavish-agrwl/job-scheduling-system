import { setTimeout as delay } from "node:timers/promises";

export default async function emailProcessor(job) {
  console.log(
    `[email] Processing job ${job.id} with data: ${JSON.stringify(job.data)}`,
  );

  await delay(500);

  if (!job.data.to) {
    throw new Error("Missing recipient email");
  }

  console.log(`[email] Job ${job.id} completed`);

  return { status: "sent", to: job.data.to, jobId: job.id };
}
