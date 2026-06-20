import mongoose from "mongoose";

const { Schema } = mongoose;

const JobSchema = new Schema(
  {
    jobId: { type: String, required: true, unique: true, index: true },
    type: { type: String, enum: ["image", "report", "email"], required: true },
    status: {
      type: String,
      enum: ["waiting", "active", "completed", "failed", "cancelled"],
      default: "waiting",
    },
    priority: { type: Number, default: 10 },
    payload: { type: Schema.Types.Mixed, required: true },
    attempts: { type: Number, default: 0 },
    result: { type: Schema.Types.Mixed },
    failReason: { type: String },
    submittedAt: { type: Date, default: Date.now },
    startedAt: { type: Date },
    completedAt: { type: Date },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  },
  {
    // We manage our own timestamps above (submittedAt/startedAt/completedAt)
    versionKey: false,
  },
);

// TTL index: documents expire at the time in `expiresAt` (auto-delete after that time)
JobSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Compound index for efficient list queries by status and recent submissions
JobSchema.index({ status: 1, submittedAt: -1 });

// Index for filtering by type and status
JobSchema.index({ type: 1, status: 1 });

const Job = mongoose.models.Job || mongoose.model("Job", JobSchema);

export default Job;
