// src/utils/distributedLock.js

import Redlock from "redlock";
import { redisConnection } from "../config/redis.js";

// Initialize Redlock with custom retry settings
const redlock = new Redlock([redisConnection], {
  retryCount: 3,
  retryDelay: 200, // ms between retries
  retryJitter: 100,
});

/**
 * Acquire a distributed lock for a given resource.
 *
 * @param {string} resource - The resource name, typically namespaced like `lock:job:${jobId}`.
 * @param {number} ttlMs - Time‑to‑live for the lock in milliseconds (default 30 000ms).
 * @returns {Promise<Redlock.Lock>} Resolves with the acquired lock. Throws if acquisition fails.
 */
export async function acquireLock(resource, ttlMs = 30000) {
  // The Redlock API accepts an array of resources and a TTL in ms.
  return redlock.acquire([resource], ttlMs);
}

/**
 * Release a previously acquired lock.
 *
 * @param {Redlock.Lock} lock
 */
export async function releaseLock(lock) {
  try {
    await lock.release();
  } catch (err) {
    // the lock might already be expired or released.
    console.warn("Redlock release error:", err.message);
  }
}

/*
 * We lock on job execution, not just enqueue. BullMQ's jobId prevents double-enqueue.
 * Redlock prevents double-execution if two workers race on a stalled job.
 */
