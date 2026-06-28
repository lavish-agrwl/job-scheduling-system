import "./config/env.js";
import cluster from "node:cluster";
import os from "node:os";

if (cluster.isPrimary) {
  await import("./workers/deadLetterWorker.js");

  const count = Math.min(os.cpus().length, 4);

  console.log(
    `Primary process ${process.pid} started. Forking ${count} workers.`,
  );

  for (let i = 0; i < count; i += 1) {
    cluster.fork();
  }

  cluster.on("exit", (worker) => {
    if (worker.exitedAfterDisconnect === false) {
      console.warn(
        `Worker process ${worker.process.pid} exited unexpectedly. Forking replacement.`,
      );
      cluster.fork();
    }
  });
}

if (cluster.isWorker) {
  await import("./workers/imageWorker.js");
  await import("./workers/reportWorker.js");
  await import("./workers/emailWorker.js");

  console.log(`Worker process ${process.pid} started`);
}
