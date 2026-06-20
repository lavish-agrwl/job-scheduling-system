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
  const { job, isDuplicate } = await submitJob(
    submission.type,
    submission.payload,
    submission.options,
  );

  const idDisplay = job && job.id ? job.id : "<existing>";
  console.log(
    `Submitted job ${idDisplay} with priority ${submission.options.priority} (isDuplicate=${isDuplicate})`,
  );
}

setTimeout(() => {
  process.exit(0);
}, 500);
