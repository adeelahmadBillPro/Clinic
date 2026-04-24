import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { z } from "zod";
import { requireApiRole } from "@/lib/api-guards";

const schema = z.object({
  planName: z.enum(["BASIC", "STANDARD", "PRO"]),
  cycle: z.enum(["monthly", "yearly"]).default("monthly"),
});

export async function POST(req: Request) {
  // Checkout sessions mutate billing — OWNER only (the person who signs
  // cheques). ADMIN roles manage clinic ops but don't approve spend.
  const gate = await requireApiRole(["OWNER"]);
  if (gate instanceof NextResponse) return gate;
  const session = gate;
  if (!session?.user?.clinicId) {
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 },
    );
  }
  if (!stripe) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Stripe not configured. Set STRIPE_SECRET_KEY + NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.",
      },
      { status: 501 },
    );
  }
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message },
      { status: 400 },
    );
  }

  const [clinic, plan] = await Promise.all([
    prisma.clinic.findUnique({ where: { id: session.user.clinicId } }),
    prisma.plan.findUnique({ where: { name: parsed.data.planName } }),
  ]);
  if (!clinic || !plan) {
    return NextResponse.json(
      { success: false, error: "Clinic or plan not found" },
      { status: 404 },
    );
  }

  const priceId =
    parsed.data.cycle === "yearly"
      ? plan.stripePriceIdYearly
      : plan.stripePriceIdMonthly;
  if (!priceId) {
    return NextResponse.json(
      {
        success: false,
        error: `Stripe price id not configured for ${plan.name} ${parsed.data.cycle}`,
      },
      { status: 400 },
    );
  }

  // Ensure Stripe customer
  let customerId = clinic.stripeCustomerId;
  if (!customerId) {
    const owner = await prisma.user.findUnique({
      where: { id: clinic.ownerId },
    });
    const customer = await stripe.customers.create({
      email: owner?.email ?? undefined,
      name: clinic.name,
      metadata: { clinicId: clinic.id },
    });
    customerId = customer.id;
    await prisma.clinic.update({
      where: { id: clinic.id },
      data: { stripeCustomerId: customerId },
    });
  }

  const origin =
    req.headers.get("origin") ??
    process.env.NEXTAUTH_URL ??
    "http://localhost:3000";

  const sessionCheckout = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/subscription?success=1`,
    cancel_url: `${origin}/subscription?cancelled=1`,
    subscription_data: {
      trial_end:
        clinic.trialEndsAt && clinic.trialEndsAt.getTime() > Date.now()
          ? Math.floor(clinic.trialEndsAt.getTime() / 1000)
          : undefined,
      metadata: { clinicId: clinic.id, planName: plan.name },
    },
    metadata: { clinicId: clinic.id, planName: plan.name },
  });

  return NextResponse.json({
    success: true,
    data: { url: sessionCheckout.url },
  });
}
