import { createHash } from "node:crypto";
import Job from "../../models/Job.js";
import { submitJob as submitJobUtil } from "../../utils/jobSubmitter.js";
import { imageQueue } from "../../queues/index.js";
import { reportQueue } from "../../queues/index.js";
import { emailQueue } from "../../queues/index.js";
import { Job as BullJob } from "bullmq";

function computeJobId(type, payload) {
  return createHash("sha256")
    .update(JSON.stringify({ type, payload }))
    .digest("hex")
    .slice(0, 16);
}

export async function submitJob(req, res, next) {
  try {
    const { type, payload, priority, delay, jobId: providedJobId } = req.body;

    if (!type || !["image", "report", "email"].includes(type)) {
      return res.status(400).json({ error: "Invalid or missing 'type'" });
    }

    if (!payload || typeof payload !== "object") {
      return res.status(400).json({ error: "Invalid or missing 'payload'" });
    }

    const jobId = providedJobId ?? computeJobId(type, payload);

    const { job, isDuplicate } = await submitJobUtil(type, payload, {
      priority,
      delay,
      jobId,
    });

    return res
      .status(202)
      .json({ jobId, type, statusUrl: `/api/jobs/${jobId}`, isDuplicate });
  } catch (err) {
    next(err);
  }
}

export async function getJob(req, res, next) {
  try {
    const { id } = req.params;
    const job = await Job.findOne({ jobId: id }).lean().exec();

    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    return res.status(200).json(job);
  } catch (err) {
    next(err);
  }
}

export async function listJobs(req, res, next) {
  try {
    const { status, type } = req.query;
    let page = parseInt(req.query.page, 10) || 1;
    let limit = parseInt(req.query.limit, 10) || 20;
    if (limit > 100) limit = 100;
    if (page < 1) page = 1;

    const filter = {};
    if (status) filter.status = status;
    if (type) filter.type = type;

    const total = await Job.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    const jobs = await Job.find(filter)
      .sort({ submittedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean()
      .exec();

    return res.status(200).json({ jobs, total, page, limit, totalPages });
  } catch (err) {
    next(err);
  }
}

function queueForType(type) {
  if (type === "image") return imageQueue;
  if (type === "report") return reportQueue;
  if (type === "email") return emailQueue;
  throw new Error(`Unknown job type: ${type}`);
}

export async function cancelJob(req, res, next) {
  try {
    const { id } = req.params;
    const jobDoc = await Job.findOne({ jobId: id }).exec();

    if (!jobDoc) {
      return res.status(404).json({ error: "Job not found" });
    }

    if (jobDoc.status !== "waiting") {
      return res
        .status(409)
        .json({ error: "Only waiting jobs can be cancelled" });
    }

    const queue = queueForType(jobDoc.type);

    const bullJob = await BullJob.fromId(queue, id);
    if (bullJob) {
      await bullJob.remove();
    }

    await Job.findOneAndUpdate(
      { jobId: id },
      { $set: { status: "cancelled", completedAt: new Date() } },
      { new: true },
    );

    return res.status(200).json({ message: "Job cancelled" });
  } catch (err) {
    next(err);
  }
}
