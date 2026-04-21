import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/permissions";
import {
  defaultRange,
  getRevenueBreakdown,
  getDailyPatients,
  getDoctorLoad,
  getPeakHours,
  getTopMedicines,
} from "@/lib/analytics";
import { AnalyticsDashboard } from "@/components/analytics/AnalyticsDashboard";

export const dynamic = "force-dynamic";
export const metadata = { title: "Analytics — ClinicOS" };

export default async function AnalyticsPage() {
  const session = await auth();
  if (!session?.user?.clinicId) redirect("/login");
  if (!isAdmin(session.user.role)) redirect("/dashboard");

  const range = defaultRange(30);

  const [revenue, daily, doctors, heatmap, topMeds] = await Promise.all([
    getRevenueBreakdown(session.user.clinicId, range),
    getDailyPatients(session.user.clinicId, range),
    getDoctorLoad(session.user.clinicId, range),
    getPeakHours(session.user.clinicId, range),
    getTopMedicines(session.user.clinicId, range),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Last 30 days · Revenue mix, patient volume, doctor load, and peak
          hours.
        </p>
      </div>
      <AnalyticsDashboard
        revenue={revenue}
        daily={daily}
        doctors={doctors}
        heatmap={heatmap}
        topMeds={topMeds}
      />
    </div>
  );
}
