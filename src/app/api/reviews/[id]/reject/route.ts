import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/api-guards";
import { getIp } from "@/lib/utils";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  // Rejecting = deleting. Admins only.
  const gate = await requireApiRole(["OWNER", "ADMIN"]);
  if (gate instanceof NextResponse) return gate;
  const session = gate;
  if (!session?.user?.clinicId) {
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 },
    );
  }

  const { id } = await params;

  const flip = await prisma.review.deleteMany({
    where: { id, clinicId: session.user.clinicId },
  });
  if (flip.count === 0) {
    return NextResponse.json(
      { success: false, error: "Review not found" },
      { status: 404 },
    );
  }

  await prisma.auditLog.create({
    data: {
      clinicId: session.user.clinicId,
      userId: session.user.id,
      userName: session.user.name ?? "Admin",
      ipAddress: getIp(req),
      action: "REVIEW_REJECTED",
      entityType: "Review",
      entityId: id,
    },
  });

  return NextResponse.json({ success: true });
}
