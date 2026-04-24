import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Best-effort client IP for audit trails. Trusts X-Forwarded-For and
 * X-Real-IP as set by Vercel / most reverse proxies. Returns null if
 * nothing usable is present so the DB column stays null (never "unknown").
 *
 * Mirrors the helper in `src/lib/rate-limit.ts`; exported here so route
 * handlers can grab it without a naming collision.
 */
export function getIp(req: Request): string | null {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim() || null;
  const xri = req.headers.get("x-real-ip");
  if (xri) return xri.trim() || null;
  return null;
}
