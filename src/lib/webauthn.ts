/**
 * WebAuthn helpers — passkey registration + authentication.
 *
 * Why this file exists:
 * - Centralises rpID / origin config so both registration and login use
 *   the same values (mismatch → "invalid origin" rejection by the browser).
 * - Wraps challenge storage in a short-lived in-memory cache. Challenges
 *   MUST round-trip the same server, so an in-memory map is fine on a
 *   single PM2 instance. For multi-node we'd swap to Redis.
 *
 * The rpID is the bare host (no scheme, no port). The origin is the
 * full URL the browser sees in `window.location.origin`. They're
 * derived from NEXTAUTH_URL so deploy + dev share one source of truth.
 */

const FIVE_MIN_MS = 5 * 60 * 1000;

type Challenge = { value: string; expiresAt: number };
const challengeStore = new Map<string, Challenge>();

function purgeExpired() {
  const now = Date.now();
  for (const [k, v] of challengeStore) {
    if (v.expiresAt <= now) challengeStore.delete(k);
  }
}

/**
 * Store a freshly-generated challenge keyed by sessionId (for logged-in
 * registration) or by an opaque token returned to the client (for
 * pre-login auth). Auto-expires after 5 minutes.
 */
export function saveChallenge(key: string, value: string) {
  purgeExpired();
  challengeStore.set(key, { value, expiresAt: Date.now() + FIVE_MIN_MS });
}

export function getChallenge(key: string): string | null {
  const entry = challengeStore.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    challengeStore.delete(key);
    return null;
  }
  return entry.value;
}

export function consumeChallenge(key: string): string | null {
  const v = getChallenge(key);
  if (v) challengeStore.delete(key);
  return v;
}

/**
 * Compute rpID + origin from NEXTAUTH_URL. WebAuthn rpID must be the
 * registrable domain (no port, no scheme). Origin must match what the
 * browser shows.
 *
 * Examples:
 *   NEXTAUTH_URL=http://187.127.158.215:3004 → rpID=187.127.158.215, origin=http://187.127.158.215:3004
 *   NEXTAUTH_URL=https://clinicos.app          → rpID=clinicos.app,    origin=https://clinicos.app
 *   NEXTAUTH_URL=http://localhost:3000         → rpID=localhost,       origin=http://localhost:3000
 */
export function getRpConfig(): { rpID: string; origin: string; rpName: string } {
  const url = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const parsed = new URL(url);
  return {
    rpID: parsed.hostname,
    origin: url.replace(/\/$/, ""),
    rpName: "ClinicOS",
  };
}
