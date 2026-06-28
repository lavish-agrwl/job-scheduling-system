# Job Scheduling System

A production-grade distributed job queue system built with **BullMQ**, **Node.js**, **MongoDB**, and **Redis**. Supports idempotent job submission, graceful retries, job status tracking, metrics collection, and a web-based admin UI.

## Quick Start

### Prerequisites

- **Node.js** (v18+) or **Bun** (v1.0+)
- **Redis** (running on localhost:6379 or configured via env)
- **MongoDB** (running on localhost:27017 or configured via env)

### Installation

```bash
bun install
# or
npm install
```

### Environment Setup

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Required variables in `.env`:

```env
REDIS_HOST=localhost
REDIS_PORT=6379
MONGO_URI=mongodb://localhost:27017/job-scheduler
NODE_ENV=development
PORT=3000
```

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      API Server                             │
│  (Express + job submission, status queries, cancellation)   │
└────────────┬──────────────────────────────────────────────┬─┘
             │                                              │
      ┌──────▼──────┐                              ┌────────▼──────┐
      │  BullMQ     │                              │  MongoDB      │
      │  Queues     │◄──────Job Sync────────────►  │  Job Records  │
      │  (Redis)    │    (QueueEvents)             │  (Audit Log)  │
      └──────┬──────┘                              └───────────────┘
             │
      ┌──────▼──────────────────────────────┐
      │      Cluster Workers                │
      │  (image, report, email processors)  │
      │  Metrics collection                 │
      │  Graceful shutdown                  │
      └─────────────────────────────────────┘
```

### Components

- **API Server** (`src/server.js`): Express app serving R EST endpoints, admin UI, metrics
- **Cluster Workers** (`src/cluster.js`): Worker pool processing jobs from queues
- **Job Sync** (`src/utils/jobSync.js`): Listens to BullMQ events, keeps MongoDB in sync
- **Idempotent Submission** (`src/utils/jobSubmitter.js`): Deterministic job IDs prevent duplicates
- **Metrics** (`src/utils/metrics.js`): Prometheus metrics (counters, histograms, gauges)
- **Admin UI**: Bull Board dashboard at `/admin/queues`

## Running the System

### Terminal 1: Start Worker Cluster

```bash
npm run start:cluster
```

Forks up to 4 worker processes (one per CPU, max 4).

### Terminal 2: Start API Server

```bash
node src/server.js
```

Starts Express server on port 3000, initializes MongoDB connection, starts job sync.

### Terminal 3: Run Load Test (Optional)

```bash
npm run load-test
```

Submits 500 jobs in 5 batches, polls MongoDB for status, prints summary.

### Terminal 4: Run Chaos Tests (Optional)

```bash
npm run chaos-test
```

Tests duplicate submission, retry on failure, DLQ verification, and cancellation.

### Terminal 5: Seed Example Jobs (Optional)

```bash
npm run seed
```

Seeds 5 image jobs into the queue for quick testing.

## API Endpoints

All endpoints are prefixed with `/api/jobs`.

### POST `/api/jobs`

Submit a new job. Returns `202 Accepted` with status URL.

**Request:**

```json
{
  "type": "image",
  "payload": { "fileName": "photo.jpg", "width": 800 },
  "priority": 10,
  "delay": 0,
  "jobId": "optional-unique-id"
}
```

**Response (202):**

```json
{
  "jobId": "abc123def456",
  "type": "image",
  "statusUrl": "/api/jobs/abc123def456",
  "isDuplicate": false
}
```

- `type`: Required. One of `image`, `report`, `email`.
- `payload`: Required. Job-specific data (object).
- `priority`: Optional (default 10). Lower = higher priority. Values: 1 (critical), 5 (high), 10 (normal), 20 (low).
- `delay`: Optional (default 0). Milliseconds before job starts.
- `jobId`: Optional. If provided, ensures idempotent submission. If omitted, computed from `SHA256(type + payload)`.

### GET `/api/jobs/:id`

Fetch job details by ID.

**Response (200):**

```json
{
  "jobId": "abc123def456",
  "type": "image",
  "status": "completed",
  "priority": 10,
  "payload": { "fileName": "photo.jpg" },
  "attempts": 1,
  "result": { "status": "done", "jobId": "abc123def456" },
  "failReason": null,
  "submittedAt": "2026-06-21T10:00:00Z",
  "startedAt": "2026-06-21T10:00:01Z",
  "completedAt": "2026-06-21T10:00:03Z"
}
```

### GET `/api/jobs?status=completed&type=image&page=1&limit=20`

List jobs with optional filtering.

**Query Params:**

- `status`: Filter by status (waiting, active, completed, failed, cancelled)
- `type`: Filter by type (image, report, email)
- `page`: Pagination (default 1)
- `limit`: Results per page (default 20, max 100)

**Response (200):**

```json
{
  "jobs": [ { ...jobDoc... }, ... ],
  "total": 150,
  "page": 1,
  "limit": 20,
  "totalPages": 8
}
```

### DELETE `/api/jobs/:id`

Cancel a waiting job.

**Response (200):**

```json
{ "message": "Job cancelled" }
```

**Errors:**

- `404`: Job not found
- `409`: Job is not in waiting status (can't cancel active/completed/failed jobs)

## Monitoring

### Admin UI

Open http://localhost:3000/admin/queues to view:

- Queue depths (waiting + active)
- Job counts by queue
- Job details and history
- Manual job actions

**⚠️ Production Note:** Disable or auth-protect `/admin/queues` in production.

### Metrics (Prometheus)

Endpoint: `GET http://localhost:3000/metrics`

Exported metrics:

- `jobs_submitted_total{type="..."}`: Counter
- `jobs_completed_total{type="..."}`: Counter
- `jobs_failed_total{type="...",finalAttempt="..."}`: Counter
- `job_duration_seconds{type="..."}`: Histogram (buckets: 0.1, 0.5, 1, 2, 5, 10, 30)
- `queue_depth{queue="..."}`: Gauge (waiting + active)
- Standard Node.js metrics (memory, CPU, event loop, etc.)

**Scrape Config Example (Prometheus):**

```yaml
global:
  scrape_interval: 15s
scrape_configs:
  - job_name: "job-scheduler"
    static_configs:
      - targets: ["localhost:3000"]
    metrics_path: "/metrics"
```

## Job Types

### Image Processing

**Payload:**

```json
{ "fileName": "photo.jpg", "width": 800, "height": 600, "shouldFail": false }
```

**Default Retries:** 3 attempts, 1s exponential backoff
**Concurrency:** 2 workers
**Processing Time:** ~2 seconds

### Report Generation

**Payload:**

```json
{ "reportName": "Q4-2026", "shouldFail": false }
```

**Default Retries:** 3 attempts, 1s exponential backoff
**Concurrency:** 1 worker
**Processing Time:** ~4 seconds

### Email Dispatch

**Payload:**

```json
{ "to": "user@example.com", "subject": "Hello" }
```

**Default Retries:** 3 attempts, 1s exponential backoff
**Concurrency:** 5 workers
**Processing Time:** ~0.5 seconds

## Idempotency

Jobs are idempotent by default:

1. **If you provide `jobId`:** that exact ID is used. Resubmitting the same job ID returns `isDuplicate: true` and the original job is unchanged.

2. **If you omit `jobId`:** a deterministic ID is computed from `SHA256(type + payload)` and sliced to 16 hex chars. This ensures identical payloads always produce the same job ID.

**Tradeoff:** If you intentionally want two identical jobs (e.g., process the same photo twice), supply a unique `jobId` for each submission.

## Database Schema

### Job Document (MongoDB)

```javascript
{
  _id: ObjectId,
  jobId: String,                    // Unique, indexed
  type: "image" | "report" | "email",
  status: "waiting" | "active" | "completed" | "failed" | "cancelled",
  priority: Number,
  payload: Object,
  attempts: Number,
  result: Object,                   // Result data if completed
  failReason: String,               // Error message if failed
  submittedAt: Date,
  startedAt: Date,
  completedAt: Date,
  expiresAt: Date,                  // TTL: auto-delete after 7 days
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**

- Unique index on `jobId`
- TTL index on `expiresAt` (auto-delete after 7 days)
- Compound index on `{ status: 1, submittedAt: -1 }`
- Compound index on `{ type: 1, status: 1 }`

## Testing

### Load Test

```bash
npm run load-test
```

Submits 500 jobs (100 per batch, 200ms between batches), polls MongoDB, prints summary:

```
Total submitted: 500
Duplicates: 0
Errors submitting: 0
Completed: 497
Failed: 3
Elapsed time: 45.3s
```

### Chaos Test

```bash
npm run chaos-test
```

Runs 4 resilience tests:

1. **Duplicate Submission** — Submit same job 10x, verify only 1 document in MongoDB
2. **Retry on Failure** — Submit failing job with 3 attempts, verify all 3 attempts exhausted
3. **DLQ Verification** — Confirm failed jobs land in dead-letter queue
4. **Cancellation Guard** — Cancel a waiting job, then verify no re-cancel possible

Output:

```
PASS: Test 1 — Duplicate Submission
PASS: Test 2 — Retry on Failure
PASS: Test 3 — DLQ Verification
PASS: Test 4 — Cancellation Guard
Final score: 4/4 tests passed
```

## Graceful Shutdown

When a worker process receives `SIGTERM`:

1. Stop accepting new jobs
2. Complete in-flight jobs (30s timeout per job)
3. Close database/queue connections
4. Exit cleanly (code 0) or with timeout (code 1)

Implemented in `src/utils/gracefulShutdown.js` and called by each worker.

## Development

### Run with Hot Reload

```bash
npm install -g nodemon
nodemon src/server.js
```

### Lint & Format

```bash
bun fmt
npm run lint
```

### Environment Variables

All configuration is loaded from `.env` on startup via `src/config/env.js`. Missing variables throw an error with the required keys.

## Troubleshooting

### "MongoDB not connected"

- Verify `.env` has `MONGO_URI=mongodb://localhost:27017/job-scheduler`
- Check MongoDB is running: `mongosh` or `mongo`

### "Redis connection refused"

- Verify `.env` has `REDIS_HOST=localhost` and `REDIS_PORT=6379`
- Check Redis is running: `redis-cli ping` (should return PONG)

### "Missing required environment variable(s)"

- Ensure `.env` exists in the project root and includes all required keys
- See `.env.example` for template

### Jobs stuck in "active" status

- Worker crash recovery: Job lock expires after 30 seconds
- Monitor logs for worker crashes
- Restart cluster: `npm run start:cluster`

## Production Checklist

- [ ] Use strong NODE_ENV (production)
- [ ] Disable or auth-protect `/admin/queues`
- [ ] Configure external MongoDB (Atlas, self-hosted, etc.)
- [ ] Configure external Redis (ElastiCache, self-hosted, etc.)
- [ ] Enable Prometheus scraping for monitoring
- [ ] Set up alerting on failed job counts
- [ ] Use process manager (PM2, systemd, Docker) to restart on crash
- [ ] Rotate job retention (TTL: 7 days default)
- [ ] Test graceful shutdown (SIGTERM handling)

## License

MIT
