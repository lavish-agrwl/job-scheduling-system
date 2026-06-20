import { submitJob } from "../utils/jobSubmitter.js";
import { connectDatabase } from "../config/database.js";
import Job from "../models/Job.js";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

(async () => {
  const startTime = Date.now();
  await connectDatabase();

  const batches = 5;
  const perBatch = 100;
  const delayBetweenBatches = 200; // ms
  const priorities = [1, 5, 10, 20];

  let submitted = 0;
  let duplicates = 0;
  let errors = 0;

  console.log(`Starting load test: ${batches * perBatch} jobs`);

  for (let b = 0; b < batches; b += 1) {
    const batchBase = b * perBatch;
    const now = Date.now();

    const promises = [];
    for (let i = 0; i < perBatch; i += 1) {
      const globalIndex = batchBase + i;
      const jobId = `load-test-${now}-${globalIndex}`;
      const typeChoices = ["image", "report", "email"];
      const type = typeChoices[globalIndex % 3];
      const priority =
        priorities[Math.floor(Math.random() * priorities.length)];

      const payload = { test: true, batch: b, index: i };

      const p = (async () => {
        try {
          const { job, isDuplicate } = await submitJob(type, payload, {
            priority,
            jobId,
          });
          submitted += 1;
          if (isDuplicate) duplicates += 1;
        } catch (err) {
          errors += 1;
          console.error(`submit error for ${jobId}: ${err.message}`);
        }
      })();

      promises.push(p);
    }

    await Promise.all(promises);

    console.log(
      `Batch ${b + 1}/${batches} submitted. Sleeping ${delayBetweenBatches}ms`,
    );
    await sleep(delayBetweenBatches);
  }

  const pollInterval = 3000;

  console.log("All batches submitted. Polling job statuses...");

  const interval = setInterval(async () => {
    const waiting = await Job.countDocuments({ status: "waiting" });
    const active = await Job.countDocuments({ status: "active" });
    const completed = await Job.countDocuments({ status: "completed" });
    const failed = await Job.countDocuments({ status: "failed" });

    console.table({ waiting, active, completed, failed });

    if (waiting + active === 0) {
      clearInterval(interval);
      const elapsed = (Date.now() - startTime) / 1000;
      console.log("Load test complete");
      console.log(`Total submitted: ${submitted}`);
      console.log(`Duplicates: ${duplicates}`);
      console.log(`Errors submitting: ${errors}`);
      console.log(`Completed: ${completed}`);
      console.log(`Failed: ${failed}`);
      console.log(`Elapsed time: ${elapsed}s`);
      process.exit(0);
    }
  }, pollInterval);
})();
