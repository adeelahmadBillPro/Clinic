import { requireRole } from "@/lib/require-role";
import { PharmacyQueue } from "@/components/pharmacy/PharmacyQueue";
import { MyDayCard } from "@/components/shared/MyDayCard";
import { RoleHeader } from "@/components/shared/RoleHeader";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pharmacy — ClinicOS" };

export default async function PharmacyPage() {
  // P3-44: role gate
  const session = await requireRole(
    ["OWNER", "ADMIN", "PHARMACIST"],
    "/pharmacy",
  );
  return (
    <div className="space-y-5">
      <RoleHeader
        title="Pharmacy"
        subtitle="Dispense prescriptions and collect payment."
        userName={session.user.name ?? "there"}
        role={session.user.role}
      />
      <MyDayCard />
      <PharmacyQueue />
    </div>
  );
}
