import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await auth();
  if (session?.user?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? "PENDING";

  const where: Record<string, unknown> =
    status === "ALL" ? {} : { status };

  const requests = await prisma.upgradeRequest.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const clinicIds = Array.from(new Set(requests.map((r) => r.clinicId)));
  const clinics = await prisma.clinic.findMany({
    where: { id: { in: clinicIds } },
    select: { id: true, name: true, slug: true, isActive: true },
  });
  const clinicMap = new Map(clinics.map((c) => [c.id, c]));

  const data = requests.map((r) => ({
    id: r.id,
    clinicId: r.clinicId,
    clinicName: clinicMap.get(r.clinicId)?.name ?? "Unknown",
    clinicSlug: clinicMap.get(r.clinicId)?.slug ?? null,
    clinicActive: clinicMap.get(r.clinicId)?.isActive ?? false,
    submitterName: r.submitterName,
    submitterEmail: r.submitterEmail,
    planName: r.planName,
    cycle: r.cycle,
    method: r.method,
    referenceNumber: r.referenceNumber,
    amountPaid: Number(r.amountPaid),
    notes: r.notes,
    status: r.status,
    reviewerName: r.reviewerName,
    reviewedAt: r.reviewedAt?.toISOString() ?? null,
    reviewNotes: r.reviewNotes,
    createdAt: r.createdAt.toISOString(),
  }));

  return NextResponse.json({ success: true, data });
}
