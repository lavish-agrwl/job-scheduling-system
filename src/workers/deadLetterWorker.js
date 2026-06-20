import { QueueEvents } from "bullmq";

import { redisSubscriber } from "../config/redis.js";
import deadLetterQueue from "../queues/deadLetterQueue.js";

const queueNames = ["image-processing", "report-generation", "email-dispatch"];

for (const queueName of queueNames) {
  const queueEvents = new QueueEvents(queueName, {
    connection: redisSubscriber.duplicate(),
  });

  queueEvents.on("failed", async (event) => {
    if (Number(event.attemptsMade) !== 3) {
      return;
    }

    await deadLetterQueue.add("dead-letter", {
      originalQueue: queueName,
      jobId: event.jobId,
      reason: event.failedReason,
    });

    console.log(
      `[DLQ] Job ${event.jobId} from ${queueName} moved to dead-letter queue`,
    );
  });
}
