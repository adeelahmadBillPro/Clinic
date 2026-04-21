import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/tenant-db";
import { SuppliersClient } from "@/components/inventory/SuppliersClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Suppliers — ClinicOS" };

export default async function SuppliersPage() {
  const session = await auth();
  if (!session?.user?.clinicId) redirect("/login");

  const t = db(session.user.clinicId);
  const suppliers = await t.supplier.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Suppliers</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Keep supplier contacts for fast purchase orders.
        </p>
      </div>
      <SuppliersClient initial={suppliers} />
    </div>
  );
}
