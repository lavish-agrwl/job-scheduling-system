import imageQueue from "../queues/imageQueue.js";

const jobs = [];

for (let i = 1; i <= 5; i += 1) {
  jobs.push(
    await imageQueue.add(`image-${i}`, {
      fileName: `photo_${i}.jpg`,
      width: 800,
      height: 600,
      shouldFail: false,
    }),
  );
}

jobs.push(
  await imageQueue.add("image-6", {
    fileName: "photo_6.jpg",
    width: 800,
    height: 600,
    shouldFail: true,
  }),
);

for (const job of jobs) {
  console.log(`Added job ${job.id}: ${job.name}`);
}

setTimeout(() => {
  process.exit(0);
}, 500);
