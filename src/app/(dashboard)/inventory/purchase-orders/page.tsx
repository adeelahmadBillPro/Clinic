import { requireRole } from "@/lib/require-role";
import { db } from "@/lib/tenant-db";
import { PurchaseOrdersClient } from "@/components/inventory/PurchaseOrdersClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Purchase orders — ClinicOS" };

export default async function PurchaseOrdersPage() {
  // P3-44: role gate
  const session = await requireRole(
    ["OWNER", "ADMIN", "PHARMACIST"],
    "/inventory/purchase-orders",
  );

  const t = db(session.user.clinicId);
  const [pos, suppliers] = await Promise.all([
    t.purchaseOrder.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    t.supplier.findMany({ orderBy: { name: "asc" } }),
  ]);

  const byId = new Map(suppliers.map((s) => [s.id, s.name]));
  const initial = pos.map((p) => ({
    id: p.id,
    poNumber: p.poNumber,
    status: p.status as "DRAFT" | "ORDERED" | "RECEIVED" | "CANCELLED",
    items: (p.items ?? []) as Array<{
      medicineId?: string | null;
      name: string;
      qty: number;
      unitPrice: number;
      total?: number;
      receivedQty?: number;
    }>,
    totalAmount: Number(p.totalAmount),
    notes: p.notes,
    orderedAt: p.orderedAt?.toISOString() ?? null,
    receivedAt: p.receivedAt?.toISOString() ?? null,
    createdAt: p.createdAt.toISOString(),
    supplier: { id: p.supplierId, name: byId.get(p.supplierId) ?? "?" },
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Purchase orders
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track orders to suppliers and receive goods into stock.
        </p>
      </div>
      <PurchaseOrdersClient
        initial={initial}
        suppliers={suppliers.map((s) => ({ id: s.id, name: s.name }))}
      />
    </div>
  );
}
