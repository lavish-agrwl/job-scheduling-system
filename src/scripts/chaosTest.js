import { setTimeout as delay } from "node:timers/promises";
import { createHash } from "node:crypto";
import { submitJob } from "../utils/jobSubmitter.js";
import { connectDatabase } from "../config/database.js";
import Job from "../models/Job.js";
import { deadLetterQueue } from "../queues/index.js";
import { emailQueue, reportQueue } from "../queues/index.js";

const API_BASE = process.env.API_BASE_URL || "http://localhost:3000";

function computeStatusJobId(type, payload) {
  return createHash("sha256")
    .update(JSON.stringify({ type, payload }))
    .digest("hex")
    .slice(0, 16);
}

function pass(label) {
  console.log(`PASS: ${label}`);
}

function fail(label, details = "") {
  console.log(`FAIL: ${label}${details ? ` - ${details}` : ""}`);
}

async function waitForCondition(checkFn, timeoutMs, intervalMs = 1000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const result = await checkFn();
    if (result) return result;
    await delay(intervalMs);
  }
  return null;
}

async function testDuplicateSubmission() {
  const jobId = "chaos-dupe-001";
  const type = "email";
  const payload = { to: "chaos@example.com", subject: "dupe test" };

  await Job.deleteOne({ jobId });
  const existing = await emailQueue.getJob(jobId);
  if (existing) {
    await existing.remove();
  }

  let ok = true;
  for (let attempt = 1; attempt <= 10; attempt += 1) {
    const { isDuplicate } = await submitJob(type, payload, {
      jobId,
      priority: 10,
    });
    if (attempt === 1 && isDuplicate) ok = false;
    if (attempt >= 2 && isDuplicate !== true) ok = false;
  }

  const count = await Job.countDocuments({ jobId });
  if (count !== 1) ok = false;

  if (ok) pass("Test 1 — Duplicate Submission");
  else
    fail(
      "Test 1 — Duplicate Submission",
      `expected 1 Mongo document, got ${count}`,
    );

  return ok;
}

async function testRetryOnFailure() {
  const jobId = `chaos-retry-${Date.now()}`;
  const payload = { shouldFail: true, chaos: "retry-test", jobId };
  const { job } = await submitJob("image", payload, {
    priority: 10,
    jobId,
    attempts: 3,
    backoff: { type: "exponential", delay: 500 },
  });

  const finalDoc = await waitForCondition(
    async () => {
      const doc = await Job.findOne({ jobId }).lean().exec();
      return doc && doc.status === "failed" ? doc : null;
    },
    30000,
    1000,
  );

  const ok = Boolean(finalDoc && finalDoc.attempts === 3);

  if (ok) pass("Test 2 — Retry on Failure");
  else
    fail(
      "Test 2 — Retry on Failure",
      finalDoc
        ? `attempts=${finalDoc.attempts}`
        : "timed out waiting for failed status",
    );

  return { ok, jobId, job };
}

async function testDlqVerification(failedJobId) {
  const jobs = await deadLetterQueue.getJobs(["waiting"]);
  const match = jobs.find(
    (entry) => entry.data && entry.data.jobId === failedJobId,
  );
  const ok = Boolean(match);

  if (ok) pass("Test 3 — DLQ Verification");
  else fail("Test 3 — DLQ Verification", `no DLQ job found for ${failedJobId}`);

  return ok;
}

async function testCancellationGuard() {
  const payload = { reportName: "chaos-cancel-test", shouldFail: false };
  const type = "report";
  const jobId = computeStatusJobId(type, payload);
  await Job.deleteOne({ jobId });
  const existing = await reportQueue.getJob(jobId);
  if (existing) {
    await existing.remove();
  }

  await reportQueue.pause();
  try {
    const { isDuplicate } = await submitJob(type, payload, {
      jobId,
      priority: 10,
    });
    if (isDuplicate) {
      // If rerun, the prior doc should have been removed above.
    }

    const waitingDoc = await waitForCondition(
      async () => {
        const doc = await Job.findOne({ jobId }).lean().exec();
        return doc && doc.status === "waiting" ? doc : null;
      },
      5000,
      250,
    );

    if (!waitingDoc) {
      fail(
        "Test 4 — Cancellation Guard",
        "job did not remain waiting long enough",
      );
      return false;
    }

    const response1 = await fetch(`${API_BASE}/api/jobs/${jobId}`, {
      method: "DELETE",
    });
    const statusAfterCancel = await Job.findOne({ jobId }).lean().exec();

    const response2 = await fetch(`${API_BASE}/api/jobs/${jobId}`, {
      method: "DELETE",
    });

    const ok =
      response1.status === 200 &&
      statusAfterCancel &&
      statusAfterCancel.status === "cancelled" &&
      response2.status === 409;

    if (ok) pass("Test 4 — Cancellation Guard");
    else {
      fail(
        "Test 4 — Cancellation Guard",
        `first=${response1.status}, second=${response2.status}, status=${statusAfterCancel ? statusAfterCancel.status : "missing"}`,
      );
    }

    return ok;
  } finally {
    await reportQueue.resume();
  }
}

(async () => {
  await connectDatabase();

  let passed = 0;

  if (await testDuplicateSubmission()) passed += 1;

  const retryResult = await testRetryOnFailure();
  if (retryResult.ok) passed += 1;

  if (await testDlqVerification(retryResult.jobId)) passed += 1;

  if (await testCancellationGuard()) passed += 1;

  console.log(`Final score: ${passed}/4 tests passed`);
  process.exit(passed === 4 ? 0 : 1);
})();
