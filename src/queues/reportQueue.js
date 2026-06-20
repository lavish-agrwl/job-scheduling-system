import { Queue } from "bullmq";

import { redisConnection } from "../config/redis.js";

const reportQueue = new Queue("report-generation", {
  connection: redisConnection,
});

export default reportQueue;
