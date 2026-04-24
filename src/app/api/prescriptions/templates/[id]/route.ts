import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/api-guards";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireApiRole(["DOCTOR", "OWNER", "ADMIN"]);
  if (gate instanceof NextResponse) return gate;
  const session = gate;
  if (!session?.user?.clinicId) {
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 },
    );
  }
  const { id } = await params;

  // Scope to this doctor + clinic so one user can't delete another's
  // templates even with a forged id.
  const flip = await prisma.prescriptionTemplate.deleteMany({
    where: {
      id,
      clinicId: session.user.clinicId,
      userId: session.user.id,
    },
  });
  if (flip.count === 0) {
    return NextResponse.json(
      { success: false, error: "Template not found" },
      { status: 404 },
    );
  }
  return NextResponse.json({ success: true });
}
