import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDoctorReviews } from "@/lib/reviews";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const doctor = await prisma.doctor.findUnique({
    where: { id },
    select: { id: true, clinicId: true },
  });
  if (!doctor) {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  }
  const reviews = await getDoctorReviews(doctor.clinicId, doctor.id, 30);
  return NextResponse.json({ success: true, data: reviews });
}
