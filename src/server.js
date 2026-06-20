import "./config/env.js";
import app from "./api/app.js";
import { connectDatabase } from "./config/database.js";
import { startJobSync } from "./utils/jobSync.js";
import { PORT } from "./config/env.js";

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
  process.exit(1);
});

(async () => {
  try {
    await connectDatabase();
    startJobSync();

    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
})();
