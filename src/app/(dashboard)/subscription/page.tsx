import { redirect } from "next/navigation";
import { requireRole } from "@/lib/require-role";
import { prisma } from "@/lib/prisma";
import { db } from "@/lib/tenant-db";
import { getClinicAccess } from "@/lib/plan";
import { SubscriptionPanel } from "@/components/subscription/SubscriptionPanel";

export const dynamic = "force-dynamic";
export const metadata = { title: "Subscription — ClinicOS" };

export default async function SubscriptionPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; cancelled?: string }>;
}) {
  // P3-44: role gate
  const session = await requireRole(["OWNER"], "/subscription");

  const sp = await searchParams;
  const access = await getClinicAccess(session.user.clinicId);
  if (!access) redirect("/login");

  const plans = await prisma.plan.findMany({
    where: { isActive: true },
    orderBy: { monthlyPrice: "asc" },
  });

  const t = db(session.user.clinicId);
  const month = new Date();
  month.setDate(1);
  month.setHours(0, 0, 0, 0);
  const [doctorCount, patientsThisMonth] = await Promise.all([
    t.doctor.count(),
    t.patient.count({ where: { createdAt: { gte: month } } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Subscription</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your plan, usage, and billing.
        </p>
      </div>
      <SubscriptionPanel
        access={{
          ...access,
          trialEndsAt: access.trialEndsAt?.toISOString() ?? null,
        }}
        plans={plans.map((p) => ({
          id: p.id,
          name: p.name,
          monthlyPrice: Number(p.monthlyPrice),
          yearlyPrice: p.yearlyPrice ? Number(p.yearlyPrice) : null,
          oneTimePrice: p.oneTimePrice ? Number(p.oneTimePrice) : null,
          maxDoctors: p.maxDoctors,
          maxPatients: p.maxPatients,
          features: p.features as Record<string, unknown>,
        }))}
        usage={{ doctorCount, patientsThisMonth }}
        flash={{
          success: sp.success === "1",
          cancelled: sp.cancelled === "1",
        }}
      />
    </div>
  );
}
