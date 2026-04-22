import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { db } from "@/lib/tenant-db";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug } = await ctx.params;
  const clinic = await prisma.clinic.findUnique({
    where: { slug },
    select: { id: true, name: true, isActive: true },
  });
  if (!clinic || !clinic.isActive) {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  }

  const t = db(clinic.id);
  const today = startOfToday();
  const [doctors, tokens, users] = await Promise.all([
    t.doctor.findMany({ where: { isAvailable: true } }),
    t.token.findMany({
      where: {
        issuedAt: { gte: today },
        status: { in: ["WAITING", "CALLED", "IN_PROGRESS"] },
      },
      orderBy: { tokenNumber: "asc" },
    }),
    prisma.user.findMany({
      where: { clinicId: clinic.id, role: "DOCTOR", isActive: true },
      select: { id: true, name: true },
    }),
  ]);

  const board = doctors.map((d) => {
    const u = users.find((x) => x.id === d.userId);
    const myTokens = tokens.filter((tk) => tk.doctorId === d.id);
    const current =
      myTokens.find((tk) => tk.status === "IN_PROGRESS") ??
      myTokens.find((tk) => tk.status === "CALLED") ??
      null;
    const next = myTokens.filter((tk) => tk.status === "WAITING").slice(0, 5);
    return {
      doctorId: d.id,
      doctorName: u?.name ?? "Doctor",
      specialization: d.specialization,
      roomNumber: d.roomNumber,
      current: current
        ? {
            id: current.id,
            displayToken: current.displayToken,
            status: current.status,
          }
        : null,
      next: next.map((tk) => ({
        id: tk.id,
        displayToken: tk.displayToken,
      })),
      waitingCount: myTokens.filter((tk) => tk.status === "WAITING").length,
    };
  });

  return NextResponse.json({
    success: true,
    data: {
      clinicName: clinic.name,
      board,
      updatedAt: new Date().toISOString(),
    },
  });
}
