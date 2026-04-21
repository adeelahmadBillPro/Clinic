import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/tenant-db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.clinicId) {
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 },
    );
  }

  const t = db(session.user.clinicId);
  const patient = await t.patient.findUnique({ where: { id } });
  if (!patient) {
    return NextResponse.json(
      { success: false, error: "Patient not found" },
      { status: 404 },
    );
  }

  return NextResponse.json({ success: true, data: patient });
}
