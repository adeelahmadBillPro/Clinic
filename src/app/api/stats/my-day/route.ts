import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/tenant-db";

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

  const t = db(session.user.clinicId);
  const userId = session.user.id;
  const role = session.user.role;
  const from = startOfDay();
  const to = endOfDay();

  if (role === "DOCTOR" || role === "OWNER" || role === "ADMIN") {
    // Find this user's doctor profile (may or may not exist for OWNER/ADMIN)
    const doctor = await t.doctor.findFirst({
      where: { userId },
    });

    if (doctor) {
      const [patientsSeen, queueWaiting, billsCollected, refersIn] =
        await Promise.all([
          t.consultation.count({
            where: {
              doctorId: doctor.id,
              createdAt: { gte: from, lte: to },
            },
          }),
          t.token.count({
            where: {
              doctorId: doctor.id,
              status: "WAITING",
              issuedAt: { gte: from, lte: to },
            },
          }),
          t.bill.findMany({
            where: {
              createdAt: { gte: from, lte: to },
              // Attribute by explicit doctorId — see P3-33. Previously this
              // used a description substring, which collided across doctors
              // with overlapping specialization strings.
              doctorId: doctor.id,
            },
            select: {
              id: true,
              totalAmount: true,
              paidAmount: true,
              balance: true,
              collectedBy: true,
            },
          }),
          // Tokens referred to this doctor today (createdAt gte today)
          t.token.count({
            where: {
              doctorId: doctor.id,
              issuedAt: { gte: from, lte: to },
              status: { not: "CANCELLED" },
            },
          }),
        ]);

      // Explicit doctorId attribution — no more description-substring
      // matching (see P3-33).
      const totalCollected = billsCollected.reduce(
        (sum, b) => sum + Number(b.paidAmount),
        0,
      );
      const myShare = totalCollected * (Number(doctor.revenueSharePct) / 100);

      return NextResponse.json({
        success: true,
        data: {
          role: "DOCTOR",
          patientsSeen,
          queueWaiting,
          tokensToday: refersIn,
          revenueCollected: totalCollected,
          revenueSharePct: Number(doctor.revenueSharePct),
          myShare,
        },
      });
    }

    // OWNER/ADMIN without doctor profile — show clinic-level admin stats
    const [newPatients, tokensIssued, billsToday] = await Promise.all([
      t.patient.count({ where: { createdAt: { gte: from, lte: to } } }),
      t.token.count({ where: { issuedAt: { gte: from, lte: to } } }),
      t.bill.findMany({
        where: { createdAt: { gte: from, lte: to } },
        select: { paidAmount: true, totalAmount: true, balance: true },
      }),
    ]);
    const collected = billsToday.reduce(
      (sum, b) => sum + Number(b.paidAmount),
      0,
    );
    const owed = billsToday.reduce((sum, b) => sum + Number(b.balance), 0);
    return NextResponse.json({
      success: true,
      data: {
        role: "ADMIN",
        newPatients,
        tokensIssued,
        revenueCollected: collected,
        outstandingDues: owed,
      },
    });
  }

  if (role === "RECEPTIONIST") {
    const [registered, tokens, billsCollected] = await Promise.all([
      // patients registered by me today — fallback: all today if we don't track creator
      t.patient.count({
        where: {
          createdAt: { gte: from, lte: to },
        },
      }),
      t.token.findMany({
        where: {
          issuedBy: userId,
          issuedAt: { gte: from, lte: to },
        },
        select: { doctorId: true },
      }),
      t.bill.findMany({
        where: {
          collectedBy: userId,
          createdAt: { gte: from, lte: to },
        },
        select: { paidAmount: true },
      }),
    ]);
    const byDoctor = new Map<string, number>();
    for (const tok of tokens) {
      byDoctor.set(tok.doctorId, (byDoctor.get(tok.doctorId) ?? 0) + 1);
    }
    const totalCollected = billsCollected.reduce(
      (s, b) => s + Number(b.paidAmount),
      0,
    );

    // Fetch doctor names for the breakdown
    const doctors = await t.doctor.findMany({
      where: { id: { in: Array.from(byDoctor.keys()) } },
    });
    // Since doctor names live on User, pull those too
    const { prisma } = await import("@/lib/prisma");
    const users = await prisma.user.findMany({
      where: { id: { in: doctors.map((d) => d.userId) } },
      select: { id: true, name: true },
    });
    const nameOf = new Map(
      doctors.map((d) => [
        d.id,
        users.find((u) => u.id === d.userId)?.name ?? "Doctor",
      ]),
    );

    return NextResponse.json({
      success: true,
      data: {
        role: "RECEPTIONIST",
        registered,
        tokensIssued: tokens.length,
        revenueCollected: totalCollected,
        assignments: Array.from(byDoctor.entries()).map(([id, count]) => ({
          doctorId: id,
          doctorName: nameOf.get(id) ?? "Doctor",
          count,
        })),
      },
    });
  }

  if (role === "PHARMACIST") {
    const [dispensed, billsCollected] = await Promise.all([
      t.pharmacyOrder.count({
        where: {
          status: { in: ["DISPENSED", "PARTIAL"] },
          createdAt: { gte: from, lte: to },
        },
      }),
      t.bill.findMany({
        where: {
          collectedBy: userId,
          billType: "PHARMACY",
          createdAt: { gte: from, lte: to },
        },
        select: { paidAmount: true },
      }),
    ]);
    const totalCollected = billsCollected.reduce(
      (s, b) => s + Number(b.paidAmount),
      0,
    );
    const activeShift = await t.cashShift.findFirst({
      where: {
        userId,
        status: "OPEN",
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        role: "PHARMACIST",
        dispensed,
        revenueCollected: totalCollected,
        shiftOpen: !!activeShift,
      },
    });
  }

  if (role === "LAB_TECH") {
    const [pendingSamples, inProgress, completedToday, ordersToday] =
      await Promise.all([
        t.labOrder.count({
          where: { status: "ORDERED" },
        }),
        t.labOrder.count({
          where: { status: { in: ["SAMPLE_COLLECTED", "IN_PROGRESS"] } },
        }),
        t.labOrder.count({
          where: {
            status: "COMPLETED",
            completedAt: { gte: from, lte: to },
          },
        }),
        t.labOrder.count({
          where: { createdAt: { gte: from, lte: to } },
        }),
      ]);

    return NextResponse.json({
      success: true,
      data: {
        role: "LAB_TECH",
        pendingSamples,
        inProgress,
        completedToday,
        ordersToday,
      },
    });
  }

  if (role === "NURSE") {
    const [admittedCount, freeBeds, totalBeds, notesToday] = await Promise.all([
      t.ipdAdmission.count({ where: { status: "ADMITTED" } }),
      t.bed.count({ where: { isOccupied: false, isActive: true } }),
      t.bed.count({ where: { isActive: true } }),
      t.nursingNote.count({
        where: {
          nurseId: userId,
          createdAt: { gte: from, lte: to },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        role: "NURSE",
        admittedCount,
        freeBeds,
        totalBeds,
        notesToday,
      },
    });
  }

  return NextResponse.json({
    success: true,
    data: { role },
  });
}
