import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await auth();
  if (session?.user?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim().toLowerCase() ?? "";
  const filter = url.searchParams.get("filter") ?? "all"; // all | active | trial | suspended

  const where: Record<string, unknown> = {};
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { slug: { contains: q, mode: "insensitive" } },
    ];
  }
  if (filter === "active") where.isActive = true;
  if (filter === "suspended") where.isActive = false;
  if (filter === "trial") {
    where.isActive = true;
    where.trialEndsAt = { gt: new Date() };
  }

  const clinics = await prisma.clinic.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const clinicIds = clinics.map((c) => c.id);
  const [owners, subs, plans, userCounts] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: clinics.map((c) => c.ownerId) } },
      select: { id: true, name: true, email: true },
    }),
    prisma.subscription.findMany({
      where: { clinicId: { in: clinicIds } },
      select: {
        clinicId: true,
        planId: true,
        status: true,
        currentPeriodEnd: true,
      },
    }),
    prisma.plan.findMany({ select: { id: true, name: true, monthlyPrice: true } }),
    prisma.user.groupBy({
      by: ["clinicId"],
      where: { clinicId: { in: clinicIds }, isActive: true },
      _count: { _all: true },
    }),
  ]);

  const ownerMap = new Map(owners.map((u) => [u.id, u]));
  const subMap = new Map(subs.map((s) => [s.clinicId, s]));
  const planMap = new Map(plans.map((p) => [p.id, p]));
  const userCountMap = new Map(
    userCounts.map((u) => [u.clinicId ?? "", u._count._all]),
  );

  const data = clinics.map((c) => {
    const sub = subMap.get(c.id);
    const plan = sub ? planMap.get(sub.planId) : null;
    const owner = ownerMap.get(c.ownerId);
    return {
      id: c.id,
      name: c.name,
      slug: c.slug,
      phone: c.phone,
      address: c.address,
      isActive: c.isActive,
      trialEndsAt: c.trialEndsAt?.toISOString() ?? null,
      createdAt: c.createdAt.toISOString(),
      owner: owner
        ? { name: owner.name, email: owner.email }
        : null,
      subscription: sub
        ? {
            status: sub.status,
            currentPeriodEnd: sub.currentPeriodEnd?.toISOString() ?? null,
            planName: plan?.name ?? null,
            monthlyPrice: plan ? Number(plan.monthlyPrice) : null,
          }
        : null,
      userCount: userCountMap.get(c.id) ?? 0,
    };
  });

  return NextResponse.json({ success: true, data });
}
