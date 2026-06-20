import { Queue } from "bullmq";

import { redisConnection } from "../config/redis.js";

const deadLetterQueue = new Queue("dead-letter", {
  connection: redisConnection,
});

export default deadLetterQueue;
