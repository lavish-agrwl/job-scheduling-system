import Redis from "ioredis";

import { REDIS_HOST, REDIS_PORT } from "./env.js";

export const redisConnection = new Redis({
  host: REDIS_HOST,
  port: Number(REDIS_PORT),
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  retryStrategy(attempt) {
    if (attempt > 10) {
      return null;
    }

    return 500 * attempt;
  },
});

redisConnection.on("ready", () => {
  console.log("Redis connected");
});

redisConnection.on("error", (error) => {
  console.error(error.message);
});
