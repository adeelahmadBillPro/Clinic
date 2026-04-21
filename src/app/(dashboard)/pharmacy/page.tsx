import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PharmacyQueue } from "@/components/pharmacy/PharmacyQueue";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pharmacy — ClinicOS" };

export default async function PharmacyPage() {
  const session = await auth();
  if (!session?.user?.clinicId) redirect("/login");
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Pharmacy</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Incoming prescriptions from doctors. Dispense, partial-dispense, or
          hold.
        </p>
      </div>
      <PharmacyQueue />
    </div>
  );
}
