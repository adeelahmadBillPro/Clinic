import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.clinicId) {
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 },
    );
  }
  if (!stripe) {
    return NextResponse.json(
      { success: false, error: "Stripe not configured" },
      { status: 501 },
    );
  }

  const clinic = await prisma.clinic.findUnique({
    where: { id: session.user.clinicId },
  });
  if (!clinic?.stripeCustomerId) {
    return NextResponse.json(
      {
        success: false,
        error: "No Stripe customer yet. Subscribe first.",
      },
      { status: 400 },
    );
  }

  const origin =
    req.headers.get("origin") ??
    process.env.NEXTAUTH_URL ??
    "http://localhost:3000";

  const portal = await stripe.billingPortal.sessions.create({
    customer: clinic.stripeCustomerId,
    return_url: `${origin}/subscription`,
  });

  return NextResponse.json({ success: true, data: { url: portal.url } });
}
