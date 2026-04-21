import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/tenant-db";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.clinicId) {
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 },
    );
  }

  const url = new URL(req.url);
  const onlyAvailable = url.searchParams.get("availableOnly") === "1";

  const t = db(session.user.clinicId);
  const doctors = await t.doctor.findMany({
    where: onlyAvailable ? { isAvailable: true } : {},
    orderBy: { specialization: "asc" },
  });

  const users = await prisma.user.findMany({
    where: {
      id: { in: doctors.map((d) => d.userId) },
      isActive: true,
    },
    select: { id: true, name: true, isActive: true },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const queueCounts = await Promise.all(
    doctors.map(async (d) => {
      const waiting = await t.token.count({
        where: {
          doctorId: d.id,
          status: { in: ["WAITING", "CALLED", "IN_PROGRESS"] },
          issuedAt: { gte: today },
        },
      });
      return { doctorId: d.id, waiting };
    }),
  );
  const waitById = new Map(queueCounts.map((q) => [q.doctorId, q.waiting]));

  const data = doctors
    .map((d) => {
      const user = users.find((u) => u.id === d.userId);
      if (!user) return null;
      return {
        id: d.id,
        name: user.name,
        specialization: d.specialization,
        qualification: d.qualification,
        roomNumber: d.roomNumber,
        consultationFee: Number(d.consultationFee),
        status: d.status,
        isAvailable: d.isAvailable,
        waitingCount: waitById.get(d.id) ?? 0,
      };
    })
    .filter(Boolean);

  return NextResponse.json({ success: true, data });
}
