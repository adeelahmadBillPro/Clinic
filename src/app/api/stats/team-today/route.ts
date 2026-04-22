import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/tenant-db";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/permissions";

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.clinicId) {
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 },
    );
  }
  if (!isAdmin(session.user.role)) {
    return NextResponse.json(
      { success: false, error: "Admin only" },
      { status: 403 },
    );
  }

  const t = db(session.user.clinicId);
  const from = startOfDay();
  const to = endOfDay();

  const [doctors, consultations, bills, tokens, users] = await Promise.all([
    t.doctor.findMany(),
    t.consultation.findMany({
      where: { createdAt: { gte: from, lte: to } },
      select: { doctorId: true },
    }),
    t.bill.findMany({
      where: { createdAt: { gte: from, lte: to } },
      select: {
        billType: true,
        paidAmount: true,
        balance: true,
        collectedBy: true,
        items: true,
      },
    }),
    t.token.findMany({
      where: { issuedAt: { gte: from, lte: to } },
      select: { doctorId: true, issuedBy: true, status: true },
    }),
    prisma.user.findMany({
      where: {
        clinicId: session.user.clinicId,
        role: { in: ["DOCTOR", "RECEPTIONIST", "PHARMACIST", "OWNER", "ADMIN"] },
      },
      select: { id: true, name: true, role: true },
    }),
  ]);

  // Doctor rows
  const doctorRows = doctors.map((d) => {
    const u = users.find((x) => x.id === d.userId);
    const seen = consultations.filter((c) => c.doctorId === d.id).length;
    const waiting = tokens.filter(
      (x) => x.doctorId === d.id && x.status === "WAITING",
    ).length;
    // Attribute OPD bills to this doctor by matching the consultation
    // description prefix.
    const collected = bills
      .filter((b) => {
        if (b.billType !== "OPD") return false;
        const items = Array.isArray(b.items)
          ? (b.items as Array<{ description?: string }>)
          : [];
        return items.some(
          (it) =>
            (it.description ?? "")
              .toLowerCase()
              .includes(d.specialization.toLowerCase()),
        );
      })
      .reduce((s, b) => s + Number(b.paidAmount), 0);
    const share = collected * (Number(d.revenueSharePct) / 100);
    return {
      id: d.id,
      name: u?.name ?? "Doctor",
      specialization: d.specialization,
      patientsSeen: seen,
      waiting,
      revenueCollected: collected,
      revenueSharePct: Number(d.revenueSharePct),
      share,
    };
  });

  // Staff rows — receptionists + pharmacists + owner/admin
  const staffRows = users
    .filter((u) => ["RECEPTIONIST", "PHARMACIST", "OWNER", "ADMIN"].includes(u.role))
    .map((u) => {
      const tokensIssued = tokens.filter((t) => t.issuedBy === u.id).length;
      const collected = bills
        .filter((b) => b.collectedBy === u.id)
        .reduce((s, b) => s + Number(b.paidAmount), 0);
      return {
        id: u.id,
        name: u.name,
        role: u.role,
        tokensIssued,
        revenueCollected: collected,
      };
    })
    .filter((r) => r.tokensIssued > 0 || r.revenueCollected > 0);

  return NextResponse.json({
    success: true,
    data: {
      doctors: doctorRows.sort(
        (a, b) => b.patientsSeen - a.patientsSeen,
      ),
      staff: staffRows.sort(
        (a, b) => b.revenueCollected - a.revenueCollected,
      ),
    },
  });
}
