import { requireRole } from "@/lib/require-role";
import { NewBillForm } from "@/components/billing/NewBillForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "New bill — ClinicOS" };

export default async function NewBillPage() {
  // P3-44: role gate
  const session = await requireRole(
    ["OWNER", "ADMIN", "RECEPTIONIST", "PHARMACIST", "LAB_TECH"],
    "/billing/new",
  );
  void session;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New bill</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Add line items, apply a discount if needed, and collect payment.
        </p>
      </div>
      <NewBillForm />
    </div>
  );
}
