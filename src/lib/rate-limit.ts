/**
 * Dead-simple in-memory sliding-window rate limiter.
 *
 * Process-local: each serverless instance keeps its own bucket. That's OK
 * as a first line of defence against casual abuse but misses coordinated
 * attacks across instances.
 *
 * TODO: move to Upstash/Redis (or the Next.js built-in `unstable_cache`
 * once that API stabilises) so limits apply across the fleet.
 */

type Entry = { count: number; windowStart: number };

const buckets = new Map<string, Entry>();

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  retryAfterSec: number;
};

export function rateLimit(
  key: string,
  max: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const entry = buckets.get(key);
  if (!entry || now - entry.windowStart >= windowMs) {
    buckets.set(key, { count: 1, windowStart: now });
    return { ok: true, remaining: max - 1, retryAfterSec: 0 };
  }
  if (entry.count >= max) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSec: Math.ceil((entry.windowStart + windowMs - now) / 1000),
    };
  }
  entry.count += 1;
  return { ok: true, remaining: max - entry.count, retryAfterSec: 0 };
}

/**
 * Best-effort client IP derivation. Trusts X-Forwarded-For and X-Real-IP,
 * which is what Vercel / most proxies set. Returns "unknown" if nothing
 * useful is present (still keyed so the unknowns share a bucket, which is
 * fine — it's a floor, not a precise identifier).
 */
export function getIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  const xri = req.headers.get("x-real-ip");
  if (xri) return xri.trim();
  return "unknown";
}

// Common presets used across the app.
export const LIMITS = {
  REVIEWS_PER_HOUR: { max: 3, windowMs: 60 * 60 * 1000 },
  BOOKINGS_PER_HOUR: { max: 5, windowMs: 60 * 60 * 1000 },
  REGISTRATIONS_PER_HOUR: { max: 3, windowMs: 60 * 60 * 1000 },
} as const;
