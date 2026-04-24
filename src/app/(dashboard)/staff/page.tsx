import { requireRole } from "@/lib/require-role";
import { prisma } from "@/lib/prisma";
import { db } from "@/lib/tenant-db";
import { StaffTable } from "@/components/staff/StaffTable";
import { AddStaffTrigger } from "@/components/staff/AddStaffTrigger";

export const dynamic = "force-dynamic";
export const metadata = { title: "Staff — ClinicOS" };

export default async function StaffPage({
  searchParams,
}: {
  searchParams: Promise<{ add?: string }>;
}) {
  // P3-44: role gate
  const session = await requireRole(["OWNER", "ADMIN"], "/staff");

  const sp = await searchParams;
  const autoOpen = sp.add === "1";

  const users = await prisma.user.findMany({
    where: { clinicId: session.user.clinicId },
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
    },
  });

  const doctorProfiles = await db(session.user.clinicId).doctor.findMany();
  const byUserId = new Map(doctorProfiles.map((d) => [d.userId, d]));
  const staff = users.map((u) => {
    const d = byUserId.get(u.id);
    return {
      ...u,
      specialization: d?.specialization ?? null,
      qualification: d?.qualification ?? null,
      roomNumber: d?.roomNumber ?? null,
      consultationFee: d ? Number(d.consultationFee) : null,
      revenueSharePct: d ? Number(d.revenueSharePct) : null,
      status: d?.status ?? null,
      isAvailable: d?.isAvailable ?? null,
      doctorId: d?.id ?? null,
      lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
      createdAt: u.createdAt.toISOString(),
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Staff</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Add doctors, receptionists, nurses, pharmacists, and other team
            members. Toggle on-duty status anytime.
          </p>
        </div>
        <AddStaffTrigger autoOpen={autoOpen} />
      </div>

      <StaffTable staff={staff} currentUserId={session.user.id} />
    </div>
  );
}
