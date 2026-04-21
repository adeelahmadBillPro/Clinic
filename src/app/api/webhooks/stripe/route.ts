import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import type Stripe from "stripe";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: Request) {
  if (!stripe) {
    return NextResponse.json(
      { success: false, error: "Stripe not configured" },
      { status: 501 },
    );
  }

  const signature = req.headers.get("stripe-signature");
  const raw = await req.text();

  let event: Stripe.Event;
  try {
    if (webhookSecret && signature) {
      event = stripe.webhooks.constructEvent(raw, signature, webhookSecret);
    } else {
      // Dev fallback — accept without signature verification
      event = JSON.parse(raw) as Stripe.Event;
    }
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
              currentPeriodEnd: new Date(((sub as unknown as { current_period_end: number }).current_period_end ?? Math.floor(Date.now() / 1000)) * 1000),
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
              currentPeriodEnd: new Date(((sub as unknown as { current_period_end: number }).current_period_end ?? Math.floor(Date.now() / 1000)) * 1000),
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
              currentPeriodEnd: new Date(((sub as unknown as { current_period_end: number }).current_period_end ?? Math.floor(Date.now() / 1000)) * 1000),
              cancelAtPeriodEnd: sub.cancel_at_period_end,
            },
            create: {
              clinicId: clinic.id,
              stripeSubscriptionId: sub.id,
              planId: clinic.planId,
              status: sub.status,
              currentPeriodEnd: new Date(((sub as unknown as { current_period_end: number }).current_period_end ?? Math.floor(Date.now() / 1000)) * 1000),
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
