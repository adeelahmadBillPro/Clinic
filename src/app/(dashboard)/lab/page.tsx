import { requireRole } from "@/lib/require-role";
import { LabQueue } from "@/components/lab/LabQueue";

export const dynamic = "force-dynamic";
export const metadata = { title: "Lab — ClinicOS" };

export default async function LabPage() {
  // P3-44: role gate
  const session = await requireRole(
    ["OWNER", "ADMIN", "LAB_TECH", "DOCTOR"],
    "/lab",
  );
  void session;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Lab</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Order tests, collect samples, enter results, and share abnormal-flagged
          reports.
        </p>
      </div>
      <LabQueue />
    </div>
  );
}
