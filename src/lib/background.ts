/**
 * Fire-and-forget a task AFTER the response has been sent. Used for:
 * - Outbound email / WhatsApp (so response time stays constant, which
 *   matters for forgot-password timing enumeration).
 * - WhatsApp notifications on token-called.
 *
 * Why not `next/server`'s `after()`? It only exists in Next 15+. We're
 * on Next 14.2, so this is a compatibility shim: schedule on the next
 * tick via `setImmediate` (queued AFTER the current response write) and
 * swallow errors so unhandled-rejection doesn't crash the process.
 *
 * Caveat: on a persistent Node server this runs reliably. On serverless
 * (Vercel/Lambda) the function instance can freeze once the response is
 * sent; upgrade to Next 15 `after()` (or move the task to a queue) when
 * deploying to serverless.
 */
export function runAfterResponse(task: () => Promise<void>): void {
  setImmediate(() => {
    task().catch((err) => {
      console.error("[runAfterResponse] task failed", err);
    });
  });
}
