import Redis from "ioredis";

import { REDIS_HOST, REDIS_PORT } from "./env.js";

const redisOptions = {
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
};

export const redisConnection = new Redis(redisOptions);

export const redisSubscriber = new Redis(redisOptions);

redisConnection.on("ready", () => {
  console.log("Redis connected");
});

redisConnection.on("error", (error) => {
  console.error(error.message);
});

redisSubscriber.on("error", (error) => {
  console.error(error.message);
});
