import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { db } from "@/lib/tenant-db";

/**
 * GET /api/setup/checklist → progress state for the new-clinic onboarding
 * checklist on the dashboard. Each step is computed from real data so it
 * "auto-completes" the moment the user does the action — no manual ticks.
 *
 * Steps:
 *   1. doctor    — at least one Doctor row exists
 *   2. settings  — clinic has been customised beyond defaults (logo, phone,
 *                  or address set; or settings explicitly saved at least
 *                  once per audit log)
 *   3. patient   — at least one Patient row exists
 *   4. token     — at least one Token has ever been issued
 *
 * Admin-only — receptionists and other staff don't see the checklist.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.clinicId) {
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 },
    );
  }
  // Only owner / admin sees the setup state — staff don't configure.
  if (
    session.user.role !== "OWNER" &&
    session.user.role !== "ADMIN"
  ) {
    return NextResponse.json(
      { success: false, error: "Admins only" },
      { status: 403 },
    );
  }

  const clinicId = session.user.clinicId;
  const t = db(clinicId);

  // Run every count + lookup in parallel — the dashboard polls this and
  // the steps are independent.
  const [doctorCount, patientCount, tokenCount, clinic, settingsAudit] =
    await Promise.all([
      t.doctor.count(),
      t.patient.count(),
      t.token.count(),
      prisma.clinic.findUnique({
        where: { id: clinicId },
        select: {
          phone: true,
          address: true,
          logoUrl: true,
          settings: true,
        },
      }),
      t.auditLog.findFirst({
        where: { action: "CLINIC_SETTINGS_UPDATED" },
        select: { id: true },
      }),
    ]);

  // Settings step is "done" if the owner has touched anything beyond the
  // register-time defaults: a logo, a phone, an address, OR an audit
  // entry showing a settings save.
  const settingsDone = Boolean(
    clinic?.logoUrl ||
      clinic?.phone ||
      clinic?.address ||
      settingsAudit,
  );

  const steps = [
    {
      id: "doctor",
      done: doctorCount > 0,
      count: doctorCount,
    },
    {
      id: "settings",
      done: settingsDone,
    },
    {
      id: "patient",
      done: patientCount > 0,
      count: patientCount,
    },
    {
      id: "token",
      done: tokenCount > 0,
      count: tokenCount,
    },
  ];

  const completedCount = steps.filter((s) => s.done).length;
  const totalCount = steps.length;

  return NextResponse.json({
    success: true,
    data: {
      steps,
      completedCount,
      totalCount,
      allDone: completedCount === totalCount,
    },
  });
}
