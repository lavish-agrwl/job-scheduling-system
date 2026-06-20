import express from "express";
import jobRoutes from "./routes/jobRoutes.js";
import { NODE_ENV } from "../config/env.js";
import serverAdapter from "./adminUI.js";

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logger
function requestLogger(req, res, next) {
  const start = Date.now();
  res.on("finish", () => {
    const ms = Date.now() - start;
    console.log(
      `[req] ${req.method} ${req.originalUrl} ${res.statusCode} ${ms}ms`,
    );
  });
  next();
}

app.use(requestLogger);

// Routes
app.use("/api/jobs", jobRoutes);
// Admin UI for queues. Remove or auth-protect this route in production
app.use("/admin/queues", serverAdapter.getRouter());

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: err.message,
    ...(NODE_ENV === "development" && { stack: err.stack }),
  });
});

export default app;
