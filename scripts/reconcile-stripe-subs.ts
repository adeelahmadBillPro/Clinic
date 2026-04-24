/**
 * One-off reconciliation for subscriptions whose `currentPeriodEnd` was
 * silently corrupted by the old `current_period_end` cast bug.
 *
 * For every local Subscription row with `stripeSubscriptionId` set,
 * fetch the live Stripe Subscription, read the correct period end from
 * `items.data[0].current_period_end`, and write it back.
 *
 * Usage:
 *   npx tsx scripts/reconcile-stripe-subs.ts        # dry-run
 *   npx tsx scripts/reconcile-stripe-subs.ts --apply
 */

import { PrismaClient } from "@prisma/client";
import Stripe from "stripe";

async function main() {
  const apply = process.argv.includes("--apply");
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    console.error("STRIPE_SECRET_KEY is not set");
    process.exit(1);
  }

  const stripe = new Stripe(secret);
  const prisma = new PrismaClient();

  const subs = await prisma.subscription.findMany({
    where: { stripeSubscriptionId: { not: null } },
    select: {
      id: true,
      clinicId: true,
      stripeSubscriptionId: true,
      currentPeriodEnd: true,
      status: true,
    },
  });

  console.log(
    `Found ${subs.length} subscription row(s) with a Stripe id.${apply ? "" : " (dry-run)"}`,
  );

  let corrected = 0;
  let skipped = 0;
  let errors = 0;

  for (const row of subs) {
    if (!row.stripeSubscriptionId) continue;
    try {
      const live = await stripe.subscriptions.retrieve(
        row.stripeSubscriptionId,
      );
      const item = live.items?.data?.[0];
      const epoch = (item as unknown as { current_period_end?: number } | undefined)
        ?.current_period_end;
      if (!epoch) {
        console.warn(`! ${row.stripeSubscriptionId}: no period end on items[0]`);
        skipped += 1;
        continue;
      }
      const liveEnd = new Date(epoch * 1000);
      const dbEnd = row.currentPeriodEnd
        ? new Date(row.currentPeriodEnd)
        : null;
      const diffMs = dbEnd ? Math.abs(liveEnd.getTime() - dbEnd.getTime()) : Infinity;
      // Tolerance of 1 hour to ignore harmless drift.
      if (diffMs < 60 * 60 * 1000) {
        skipped += 1;
        continue;
      }
      console.log(
        `~ ${row.stripeSubscriptionId}: db=${dbEnd?.toISOString() ?? "null"} → live=${liveEnd.toISOString()} (status ${live.status})`,
      );
      if (apply) {
        await prisma.subscription.update({
          where: { id: row.id },
          data: {
            currentPeriodEnd: liveEnd,
            status: live.status,
            cancelAtPeriodEnd: live.cancel_at_period_end,
          },
        });
      }
      corrected += 1;
    } catch (err) {
      errors += 1;
      console.error(`x ${row.stripeSubscriptionId}:`, err);
    }
  }

  console.log(
    `\nDone. corrected=${corrected} skipped=${skipped} errors=${errors}${apply ? "" : " (dry-run — pass --apply to persist)"}`,
  );
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
