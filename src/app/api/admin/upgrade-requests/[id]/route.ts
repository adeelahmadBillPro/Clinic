import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  action: z.enum(["approve", "reject"]),
  reviewNotes: z.string().trim().max(500).optional(),
});

const CYCLE_TO_DAYS: Record<string, number> = {
  monthly: 30,
  yearly: 365,
  oneTime: 365 * 5, // treat one-time as "5 years of access"
};

class AlreadyReviewedError extends Error {}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (session?.user?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "Invalid" },
      { status: 400 },
    );
  }

  const request = await prisma.upgradeRequest.findUnique({ where: { id } });
  if (!request) {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  }
  if (request.status !== "PENDING") {
    return NextResponse.json(
      { success: false, error: "This request is already reviewed" },
      { status: 400 },
    );
  }

  if (parsed.data.action === "reject") {
    // CAS: only flip if still PENDING. Without this a double-click could
    // stamp the row twice; harmless here but the same pattern is used for
    // approve below, where it's critical.
    const flip = await prisma.upgradeRequest.updateMany({
      where: { id, status: "PENDING" },
      data: {
        status: "REJECTED",
        reviewedBy: session.user.id,
        reviewerName: session.user.name ?? "Admin",
        reviewedAt: new Date(),
        reviewNotes: parsed.data.reviewNotes ?? null,
      },
    });
    if (flip.count === 0) {
      return NextResponse.json(
        { success: false, error: "Already reviewed" },
        { status: 409 },
      );
    }

    // Notify the clinic owner
    const clinic = await prisma.clinic.findUnique({
      where: { id: request.clinicId },
      select: { ownerId: true },
    });
    if (clinic) {
      await prisma.notification.create({
        data: {
          clinicId: request.clinicId,
          userId: clinic.ownerId,
          type: "UPGRADE_REJECTED",
          channel: "IN_APP",
          message: `Your upgrade request (ref ${request.referenceNumber}) was not approved.${parsed.data.reviewNotes ? ` Note: ${parsed.data.reviewNotes}` : " Please contact support."}`,
          status: "SENT",
        },
      });
    }

    return NextResponse.json({ success: true });
  }

  // APPROVE — find or create subscription and extend.
  const plan = await prisma.plan.findFirst({
    where: { name: request.planName, isActive: true },
  });
  if (!plan) {
    return NextResponse.json(
      { success: false, error: `Plan "${request.planName}" not found` },
      { status: 400 },
    );
  }

  const days = CYCLE_TO_DAYS[request.cycle] ?? 30;
  const existingSub = await prisma.subscription.findUnique({
    where: { clinicId: request.clinicId },
  });

  const base =
    existingSub?.currentPeriodEnd && existingSub.currentPeriodEnd > new Date()
      ? existingSub.currentPeriodEnd
      : new Date();
  const newEnd = new Date(base);
  newEnd.setDate(newEnd.getDate() + days);

  try {
    await prisma.$transaction(async (tx) => {
      // Compare-and-swap the request status FIRST so concurrent approvals
      // are rejected before we extend the subscription twice. Anything
      // after this flip only runs in the winning request.
      const flip = await tx.upgradeRequest.updateMany({
        where: { id, status: "PENDING" },
        data: {
          status: "APPROVED",
          reviewedBy: session.user.id,
          reviewerName: session.user.name ?? "Admin",
          reviewedAt: new Date(),
          reviewNotes: parsed.data.reviewNotes ?? null,
        },
      });
      if (flip.count === 0) {
        throw new AlreadyReviewedError();
      }

      if (existingSub) {
        await tx.subscription.update({
          where: { clinicId: request.clinicId },
          data: {
            planId: plan.id,
            status: "ACTIVE",
            currentPeriodEnd: newEnd,
            cancelAtPeriodEnd: false,
          },
        });
      } else {
        await tx.subscription.create({
          data: {
            clinicId: request.clinicId,
            planId: plan.id,
            status: "ACTIVE",
            currentPeriodEnd: newEnd,
          },
        });
      }

      // Activate the clinic and clear the trial
      await tx.clinic.update({
        where: { id: request.clinicId },
        data: {
          isActive: true,
          planId: plan.id,
          trialEndsAt: null,
        },
      });
    });
  } catch (err) {
    if (err instanceof AlreadyReviewedError) {
      return NextResponse.json(
        { success: false, error: "Already reviewed" },
        { status: 409 },
      );
    }
    throw err;
  }

  // Notify the clinic owner
  const clinic = await prisma.clinic.findUnique({
    where: { id: request.clinicId },
    select: { ownerId: true },
  });
  if (clinic) {
    await prisma.notification.create({
      data: {
        clinicId: request.clinicId,
        userId: clinic.ownerId,
        type: "UPGRADE_APPROVED",
        channel: "IN_APP",
        message: `Your ${plan.name} plan is now active until ${newEnd.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}. Thank you!`,
        status: "SENT",
      },
    });
  }

  return NextResponse.json({ success: true, data: { periodEnd: newEnd } });
}
