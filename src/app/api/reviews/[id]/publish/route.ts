import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/api-guards";
import { getIp } from "@/lib/utils";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  // Review publishing is a content-moderation decision — admins only.
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

  // Scope to this clinic so an admin from another tenant can't publish
  // reviews we haven't seen. `updateMany` returns count=0 instead of
  // throwing, which also keeps tenant existence from leaking.
  const flip = await prisma.review.updateMany({
    where: { id, clinicId: session.user.clinicId },
    data: { isPublished: true },
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
      action: "REVIEW_PUBLISHED",
      entityType: "Review",
      entityId: id,
    },
  });

  return NextResponse.json({ success: true });
}
