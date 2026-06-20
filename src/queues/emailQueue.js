import { Queue } from "bullmq";

import { redisConnection } from "../config/redis.js";

const emailQueue = new Queue("email-dispatch", {
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

export default emailQueue;
