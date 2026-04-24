import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import type Stripe from "stripe";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

// In Stripe SDK 22+ (API 2024-10+), `current_period_end` was removed from
// the Subscription root and lives on SubscriptionItem. Reading it off
// sub directly returns undefined; the previous `?? now()` fallback was
// silently expiring every paying clinic on each invoice event. Throws
// on a missing value — a missing value means a real bug.
function subPeriodEndDate(sub: Stripe.Subscription): Date {
  const item = sub.items?.data?.[0];
  const epoch = (item as unknown as { current_period_end?: number } | undefined)
    ?.current_period_end;
  if (!epoch || typeof epoch !== "number") {
    throw new Error(
      `Stripe subscription ${sub.id} missing items[0].current_period_end`,
    );
  }
  return new Date(epoch * 1000);
}

export async function POST(req: Request) {
  if (!stripe) {
    return NextResponse.json(
      { success: false, error: "Stripe not configured" },
      { status: 501 },
    );
  }

  const signature = req.headers.get("stripe-signature");
  const raw = await req.text();

  // Hard-fail when the secret or signature header is missing. The
  // previous dev fallback (JSON.parse on unsigned body) meant anyone
  // could POST a forged event and mutate subscription state.
  if (!webhookSecret) {
    console.error("[stripe webhook] STRIPE_WEBHOOK_SECRET is not set");
    return NextResponse.json(
      { success: false, error: "Webhook not configured" },
      { status: 400 },
    );
  }
  if (!signature) {
    return NextResponse.json(
      { success: false, error: "Missing signature" },
      { status: 400 },
    );
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, signature, webhookSecret);
  } catch (err) {
    console.error("[stripe webhook] signature verify failed", err);
    return NextResponse.json(
      { success: false, error: "Invalid signature" },
      { status: 400 },
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;
        const clinicId = (s.metadata?.clinicId as string | undefined) ?? undefined;
        const planName =
          (s.metadata?.planName as string | undefined) ?? undefined;
        if (clinicId && s.subscription) {
          const sub = await stripe.subscriptions.retrieve(
            typeof s.subscription === "string"
              ? s.subscription
              : s.subscription.id,
          );
          const plan = planName
            ? await prisma.plan.findUnique({ where: { name: planName } })
            : null;
          await prisma.subscription.upsert({
            where: { clinicId },
            update: {
              stripeSubscriptionId: sub.id,
              status: sub.status,
              currentPeriodEnd: subPeriodEndDate(sub),
              cancelAtPeriodEnd: sub.cancel_at_period_end,
              ...(plan ? { planId: plan.id } : {}),
            },
            create: {
              clinicId,
              stripeSubscriptionId: sub.id,
              planId:
                plan?.id ??
                (await prisma.plan.findFirst({ where: { name: "PRO" } }))?.id ??
                "",
              status: sub.status,
              currentPeriodEnd: subPeriodEndDate(sub),
              cancelAtPeriodEnd: sub.cancel_at_period_end,
            },
          });
          if (plan) {
            await prisma.clinic.update({
              where: { id: clinicId },
              data: { planId: plan.id, subscriptionId: sub.id },
            });
          }
        }
        break;
      }
      case "invoice.payment_succeeded":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const clinic = await prisma.clinic.findFirst({
          where: { stripeCustomerId: sub.customer as string },
        });
        if (clinic) {
          await prisma.subscription.upsert({
            where: { clinicId: clinic.id },
            update: {
              stripeSubscriptionId: sub.id,
              status: sub.status,
              currentPeriodEnd: subPeriodEndDate(sub),
              cancelAtPeriodEnd: sub.cancel_at_period_end,
            },
            create: {
              clinicId: clinic.id,
              stripeSubscriptionId: sub.id,
              planId: clinic.planId,
              status: sub.status,
              currentPeriodEnd: subPeriodEndDate(sub),
              cancelAtPeriodEnd: sub.cancel_at_period_end,
            },
          });
        }
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const clinic = await prisma.clinic.findFirst({
          where: { stripeCustomerId: invoice.customer as string },
        });
        if (clinic) {
          await prisma.subscription.update({
            where: { clinicId: clinic.id },
            data: { status: "past_due" },
          });
        }
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const clinic = await prisma.clinic.findFirst({
          where: { stripeCustomerId: sub.customer as string },
        });
        if (clinic) {
          await prisma.subscription.update({
            where: { clinicId: clinic.id },
            data: { status: "cancelled" },
          });
        }
        break;
      }
      default:
        break;
    }
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[stripe webhook] handler error", err);
    return NextResponse.json(
      { success: false, error: "Webhook handler error" },
      { status: 500 },
    );
  }
}
