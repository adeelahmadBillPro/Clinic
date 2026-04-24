import { requireRole } from "@/lib/require-role";
import { PharmacyQueue } from "@/components/pharmacy/PharmacyQueue";
import { MyDayCard } from "@/components/shared/MyDayCard";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pharmacy — ClinicOS" };

export default async function PharmacyPage() {
  // P3-44: role gate
  const session = await requireRole(
    ["OWNER", "ADMIN", "PHARMACIST"],
    "/pharmacy",
  );
  void session;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Pharmacy</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Incoming prescriptions from doctors. Dispense, partial-dispense, or
          hold.
        </p>
      </div>
      <MyDayCard />
      <PharmacyQueue />
    </div>
  );
}
