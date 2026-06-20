import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import {
  imageQueue,
  reportQueue,
  emailQueue,
  deadLetterQueue,
} from "../queues/index.js";

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath("/admin/queues");

createBullBoard({
  queues: [imageQueue, reportQueue, emailQueue, deadLetterQueue].map(
    (q) => new BullMQAdapter(q),
  ),
  serverAdapter,
});

export default serverAdapter;
