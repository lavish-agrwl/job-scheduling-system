import { Queue } from "bullmq";

import { redisConnection } from "../config/redis.js";

const imageQueue = new Queue("image-processing", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
    removeOnComplete: { count: 100 },
    removeOnFail: false,
  },
});

export default imageQueue;
