import express from "express";
import {
  submitJob,
  getJob,
  listJobs,
  cancelJob,
} from "../controllers/jobController.js";

const router = express.Router();

router.post("/", async (req, res, next) => submitJob(req, res, next));
router.get("/", async (req, res, next) => listJobs(req, res, next));
router.get("/:id", async (req, res, next) => getJob(req, res, next));
router.delete("/:id", async (req, res, next) => cancelJob(req, res, next));

export default router;
