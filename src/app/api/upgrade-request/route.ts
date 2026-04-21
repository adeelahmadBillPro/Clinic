import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/tenant-db";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  planName: z.enum(["BASIC", "STANDARD", "PRO"]),
  cycle: z.enum(["monthly", "yearly", "oneTime"]),
  method: z.enum(["BANK_TRANSFER", "JAZZCASH", "EASYPAISA", "CASH"]),
  referenceNumber: z
    .string()
    .trim()
    .min(3, "Reference number required")
    .max(100),
  amountPaid: z.coerce.number().positive(),
  notes: z.string().max(500).optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.clinicId) {
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 },
    );
  }
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Invalid input",
        field: parsed.error.issues[0]?.path.join("."),
      },
      { status: 400 },
    );
  }

  const t = db(session.user.clinicId);
  const clinic = await prisma.clinic.findUnique({
    where: { id: session.user.clinicId },
    select: { name: true, ownerId: true },
  });

  // Proper platform-level queue row for super admin
  await prisma.upgradeRequest.create({
    data: {
      clinicId: session.user.clinicId,
      submittedBy: session.user.id,
      submitterName: session.user.name ?? "User",
      submitterEmail: session.user.email ?? "",
      planName: parsed.data.planName,
      cycle: parsed.data.cycle,
      method: parsed.data.method,
      referenceNumber: parsed.data.referenceNumber,
      amountPaid: parsed.data.amountPaid,
      notes: parsed.data.notes ?? null,
    },
  });

  // Also echo to the clinic owner's in-app inbox so they see their own request
  await t.notification.create({
    data: {
      clinicId: session.user.clinicId,
      userId: clinic?.ownerId ?? session.user.id,
      type: "UPGRADE_REQUEST",
      channel: "IN_APP",
      message: `Manual upgrade — ${parsed.data.planName} (${parsed.data.cycle}) · ${parsed.data.method} ref ${parsed.data.referenceNumber} · ₨ ${parsed.data.amountPaid}${parsed.data.notes ? ` · ${parsed.data.notes}` : ""}`,
      status: "PENDING",
    },
  });

  await t.auditLog.create({
    data: {
      clinicId: session.user.clinicId,
      userId: session.user.id,
      userName: session.user.name ?? "User",
      action: "UPGRADE_REQUESTED",
      entityType: "Subscription",
      details: {
        planName: parsed.data.planName,
        cycle: parsed.data.cycle,
        method: parsed.data.method,
        referenceNumber: parsed.data.referenceNumber,
        amountPaid: parsed.data.amountPaid,
        notes: parsed.data.notes,
      },
    },
  });

  return NextResponse.json({
    success: true,
    data: {
      message:
        "Upgrade request received. We'll verify your payment and activate within 24 hours.",
    },
  });
}
