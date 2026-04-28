import { requireRole } from "@/lib/require-role";
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
  // P3-44: role gate
  const session = await requireRole(["OWNER", "ADMIN"], "/analytics");

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
          Trends, revenue, patients seen, top doctors.{" "}
          <span className="text-foreground/70">Last 30 days.</span>
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
