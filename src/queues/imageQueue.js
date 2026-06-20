import { Queue } from "bullmq";

import { redisConnection } from "../config/redis.js";

const imageQueue = new Queue("image-processing", {
  connection: redisConnection,
});

export default imageQueue;
