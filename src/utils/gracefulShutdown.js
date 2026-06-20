export function setupGracefulShutdown(worker, queueName) {
  let isShuttingDown = false;

  const shutdown = async () => {
    if (isShuttingDown) {
      return;
    }

    isShuttingDown = true;

    console.log(`[${queueName}] Shutdown signal received. Draining active jobs...`);

    const timeout = setTimeout(() => {
      console.warn(`[${queueName}] Worker shutdown timed out after 30 seconds.`);
      process.exit(1);
    }, 30000);

    try {
      await worker.pause();
      await worker.close();
      clearTimeout(timeout);
      console.log(`[${queueName}] Worker shut down cleanly.`);
      process.exit(0);
    } catch (error) {
      clearTimeout(timeout);
      console.error(`[${queueName}] Worker shutdown failed: ${error.message}`);
      process.exit(1);
    }
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}
