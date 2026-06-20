import { submitJob } from "../utils/jobSubmitter.js";

const submissions = [
  {
    type: "image",
    payload: { fileName: "urgent.jpg", shouldFail: false },
    options: { priority: 1 },
  },
  {
    type: "email",
    payload: { to: "a@example.com" },
    options: { priority: 20 },
  },
  {
    type: "report",
    payload: { reportName: "Q4", shouldFail: false },
    options: { priority: 5 },
  },
  {
    type: "image",
    payload: { fileName: "batch.jpg", shouldFail: false },
    options: { priority: 10 },
  },
  {
    type: "email",
    payload: { to: "ceo@example.com" },
    options: { priority: 1 },
  },
  {
    type: "image",
    payload: { fileName: "failed.jpg", shouldFail: true },
    options: { priority: 10 },
  },
];

for (const submission of submissions) {
  const job = await submitJob(
    submission.type,
    submission.payload,
    submission.options,
  );

  console.log(`Submitted job ${job.id} with priority ${submission.options.priority}`);
}

setTimeout(() => {
  process.exit(0);
}, 500);
