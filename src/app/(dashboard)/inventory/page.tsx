import Link from "next/link";
import { requireRole } from "@/lib/require-role";
import { db } from "@/lib/tenant-db";
import { InventoryOverview } from "@/components/inventory/InventoryOverview";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Inventory — ClinicOS" };

export default async function InventoryPage() {
  // P3-44: role gate
  const session = await requireRole(
    ["OWNER", "ADMIN", "PHARMACIST"],
    "/inventory",
  );

  const t = db(session.user.clinicId);
  const [medicines, totalCount, expSoon] = await Promise.all([
    t.medicine.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      take: 500,
    }),
    t.medicine.count({ where: { isActive: true } }),
    t.medicine.findMany({
      where: {
        isActive: true,
        expiryDate: {
          lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          gte: new Date(),
        },
      },
      orderBy: { expiryDate: "asc" },
      take: 20,
    }),
  ]);

  const rows = medicines.map((m) => ({
    id: m.id,
    name: m.name,
    genericName: m.genericName,
    category: m.category,
    unit: m.unit,
    stockQty: Number(m.stockQty),
    minStockLevel: Number(m.minStockLevel),
    purchasePrice: Number(m.purchasePrice),
    salePrice: Number(m.salePrice),
    batchNumber: m.batchNumber,
    expiryDate: m.expiryDate?.toISOString() ?? null,
    location: m.location,
  }));

  const lowStock = rows.filter((m) => m.stockQty <= m.minStockLevel).length;
  const stockValue = rows.reduce((s, m) => s + m.stockQty * m.purchasePrice, 0);
  const expSoonCount = expSoon.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Inventory</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track medicines, stock levels and expiry dates.{" "}
            <span className="text-foreground/70">
              {totalCount} medicines · ₨{" "}
              {Math.round(stockValue).toLocaleString()} stock value.
            </span>
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/inventory/purchase-orders"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Purchase orders
          </Link>
          <Link
            href="/inventory/suppliers"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Suppliers
          </Link>
        </div>
      </div>

      <InventoryOverview
        medicines={rows}
        lowStockCount={lowStock}
        expSoonCount={expSoonCount}
        stockValue={stockValue}
        expSoon={expSoon.map((m) => ({
          id: m.id,
          name: m.name,
          batchNumber: m.batchNumber,
          expiryDate: m.expiryDate?.toISOString() ?? null,
          stockQty: Number(m.stockQty),
        }))}
      />
    </div>
  );
}
