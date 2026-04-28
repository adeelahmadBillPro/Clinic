import { requireRole } from "@/lib/require-role";
import { db } from "@/lib/tenant-db";
import { SuppliersClient } from "@/components/inventory/SuppliersClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Suppliers — ClinicOS" };

export default async function SuppliersPage() {
  // P3-44: role gate
  const session = await requireRole(
    ["OWNER", "ADMIN", "PHARMACIST"],
    "/inventory/suppliers",
  );

  const t = db(session.user.clinicId);
  const suppliers = await t.supplier.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Suppliers</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your medicine suppliers.
        </p>
      </div>
      <SuppliersClient initial={suppliers} />
    </div>
  );
}
