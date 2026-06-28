import { QueueEvents } from "bullmq";

import { redisSubscriber } from "../config/redis.js";
import deadLetterQueue from "../queues/deadLetterQueue.js";

const queueNames = ["image-processing", "report-generation", "email-dispatch"];

for (const queueName of queueNames) {
  const queueEvents = new QueueEvents(queueName, {
    connection: redisSubscriber.duplicate(),
  });

  queueEvents.on("retries-exhausted", async (event) => {
    try {
      await deadLetterQueue.add("dead-letter", {
        originalQueue: queueName,
        jobId: event.jobId,
        attemptsMade: Number(event.attemptsMade),
        reason: "Retries exhausted",
      });

      console.log(
        `[DLQ] Job ${event.jobId} from ${queueName} moved to dead-letter queue after ${event.attemptsMade} attempts`,
      );
    } catch (error) {
      console.error(
        `[DLQ] Failed to move job ${event.jobId} from ${queueName} to dead-letter queue: ${error.message}`,
      );
    }
  });
}
