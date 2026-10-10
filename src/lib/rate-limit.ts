import RateLimitModel from '@/models/RateLimit';
import { tooManyRequests } from './api';

/**
 * Counts one request for `key` in the current fixed window and reports whether it is
 * still within `limit`. Stored in MongoDB so it works across serverless instances.
 */
export async function consumeRateLimit(key: string, limit: number, windowSeconds: number) {
  const windowMs = windowSeconds * 1000;
  const windowStart = Math.floor(Date.now() / windowMs) * windowMs;
  const counter = await RateLimitModel.findOneAndUpdate(
    { key: `${key}:${windowStart}` },
    { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date(windowStart + windowMs) } },
    { upsert: true, new: true, lean: true },
  );
  return (counter?.count ?? 1) <= limit; // upsert + new always returns the counter
}

/** Like `consumeRateLimit`, but throws a 429 (with `message`, if given) when over the limit. */
export async function enforceRateLimit(key: string, limit: number, windowSeconds: number, message?: string) {
  if (!(await consumeRateLimit(key, limit, windowSeconds))) throw tooManyRequests(message);
}
