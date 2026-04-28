import { redirect } from "next/navigation";
import Link from "next/link";
import { auth, ROLE_HOME } from "@/auth";
import { isAdmin } from "@/lib/permissions";
import { getDashboardMetrics, getClinicMap } from "@/lib/dashboard";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { ClinicMap } from "@/components/dashboard/ClinicMap";
import { ResetTokensButton } from "@/components/dashboard/ResetTokensButton";
import { TodayPanel } from "@/components/dashboard/TodayPanel";
import { TeamPerformanceTable } from "@/components/dashboard/TeamPerformanceTable";
import { OnboardingChecklist } from "@/components/dashboard/OnboardingChecklist";
import { buttonVariants } from "@/components/ui/button";
import { UserPlus, BanknoteArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!session.user.clinicId) redirect("/login");

  // Non-admin roles get sent to their own home screen.
  if (!isAdmin(session.user.role)) {
    redirect(ROLE_HOME[session.user.role]);
  }

  const [metrics, clinicMap] = await Promise.all([
    getDashboardMetrics(session.user.clinicId),
    getClinicMap(session.user.clinicId),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Good {greetingByHour()}, {session.user.name?.split(" ").slice(-1)[0]}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Today at your clinic — quick stats and queue.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ResetTokensButton />
          <Link
            href="/staff?add=1"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            <UserPlus className="mr-1.5 h-3.5 w-3.5" />
            Add staff
          </Link>
          <Link
            href="/billing/new"
            className={cn(buttonVariants({ size: "sm" }))}
          >
            <BanknoteArrowDown className="mr-1.5 h-3.5 w-3.5" />
            New bill
          </Link>
        </div>
      </div>

      {/* First-time setup checklist — auto-hides once all 4 steps are done. */}
      <OnboardingChecklist />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard
          label="Patients today"
          value={metrics.patientsToday}
          icon="Users"
        />
        <KpiCard
          label="Revenue today"
          value={metrics.revenueToday}
          format="currency"
          icon="Receipt"
          tone="success"
          currencySymbol="₨"
        />
        <KpiCard
          label="Active tokens"
          value={metrics.activeTokens}
          icon="CircleUserRound"
        />
        <KpiCard
          label="Doctors on duty"
          value={metrics.doctorsOnDuty}
          icon="Stethoscope"
        />
        <KpiCard
          label="Pending pharmacy"
          value={metrics.pendingPharmacyOrders}
          icon="Pill"
          tone={metrics.pendingPharmacyOrders > 5 ? "warning" : "default"}
        />
        <KpiCard
          label="Low stock items"
          value={metrics.lowStockCount}
          icon="Package"
          tone={metrics.lowStockCount > 0 ? "danger" : "default"}
          shakeWhenPositive
        />
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold">Live clinic</h2>
        <ClinicMap map={clinicMap} />
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold">Today at a glance</h2>
        <TodayPanel clinicId={session.user.clinicId} />
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold">Team performance today</h2>
        <TeamPerformanceTable />
      </div>
    </div>
  );
}

function greetingByHour() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}
