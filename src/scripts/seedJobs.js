import { submitJob } from "../utils/jobSubmitter.js";

const jobs = [];

for (let i = 1; i <= 5; i += 1) {
  const payload = {
    fileName: `photo_${i}.jpg`,
    width: 800,
    height: 600,
    shouldFail: false,
  };

  const { job, isDuplicate } = await submitJob("image", payload, {
    // name-based jobId would be deterministic via submitJob when not provided
    priority: 10,
  });

  jobs.push({ job, isDuplicate });
}

const { job: job6, isDuplicate: dup6 } = await submitJob("image", {
  fileName: "photo_6.jpg",
  width: 800,
  height: 600,
  shouldFail: true,
});

jobs.push({ job: job6, isDuplicate: dup6 });

for (const entry of jobs) {
  const id = entry.job && entry.job.id ? entry.job.id : "<existing>";
  const name = entry.job && entry.job.name ? entry.job.name : "image";
  console.log(`Added job ${id}: ${name} (isDuplicate=${entry.isDuplicate})`);
}

setTimeout(() => {
  process.exit(0);
}, 500);
