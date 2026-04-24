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

  // Single groupBy instead of one `count` per doctor (N+1 on the doctor
  // list endpoint was a real pig on clinics with 15+ doctors).
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const waitGroups = await t.token.groupBy({
    by: ["doctorId"],
    where: {
      issuedAt: { gte: today },
      status: { in: ["WAITING", "CALLED", "IN_PROGRESS"] },
    },
    _count: { _all: true },
  });
  const waitById = new Map(
    waitGroups.map((g) => [g.doctorId, g._count._all]),
  );

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
