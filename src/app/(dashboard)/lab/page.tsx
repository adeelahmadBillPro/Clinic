import { requireRole } from "@/lib/require-role";
import { LabQueue } from "@/components/lab/LabQueue";
import { MyDayCard } from "@/components/shared/MyDayCard";
import { RoleHeader } from "@/components/shared/RoleHeader";

export const dynamic = "force-dynamic";
export const metadata = { title: "Lab — ClinicOS" };

export default async function LabPage() {
  // P3-44: role gate
  const session = await requireRole(
    ["OWNER", "ADMIN", "LAB_TECH", "DOCTOR"],
    "/lab",
  );
  return (
    <div className="space-y-5">
      <RoleHeader
        title="Lab"
        subtitle="Track sample collection, results and reports."
        userName={session.user.name ?? "there"}
        role={session.user.role}
      />
      <MyDayCard />
      <LabQueue />
    </div>
  );
}
