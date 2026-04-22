import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { db } from "@/lib/tenant-db";
import { prisma } from "@/lib/prisma";
import { ArrowLeft } from "lucide-react";
import { PurchaseOrderPrintView } from "@/components/inventory/PurchaseOrderPrintView";

export const dynamic = "force-dynamic";
export const metadata = { title: "Purchase order — ClinicOS" };

export default async function PoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.clinicId) redirect("/login");

  const t = db(session.user.clinicId);
  const po = await t.purchaseOrder.findUnique({ where: { id } });
  if (!po) notFound();

  const [supplier, clinic] = await Promise.all([
    t.supplier.findUnique({ where: { id: po.supplierId } }),
    prisma.clinic.findUnique({
      where: { id: session.user.clinicId },
      select: { name: true, phone: true, address: true },
    }),
  ]);

  const items = Array.isArray(po.items)
    ? (po.items as Array<{
        name: string;
        qty: number;
        unitPrice: number;
        receivedQty?: number;
      }>)
    : [];

  return (
    <div className="mx-auto max-w-3xl">
      <div className="no-print mb-4 flex items-center justify-between">
        <Link
          href="/inventory/purchase-orders"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to purchase orders
        </Link>
      </div>

      <PurchaseOrderPrintView
        clinic={{
          name: clinic?.name ?? "Clinic",
          phone: clinic?.phone ?? null,
          address: clinic?.address ?? null,
        }}
        supplier={
          supplier
            ? {
                name: supplier.name,
                contactPerson: supplier.contact,
                phone: supplier.phone,
                email: supplier.email,
                address: supplier.address,
              }
            : null
        }
        po={{
          poNumber: po.poNumber,
          status: po.status,
          createdAt: po.createdAt.toISOString(),
          expectedDate: po.orderedAt?.toISOString() ?? null,
          receivedAt: po.receivedAt?.toISOString() ?? null,
          totalAmount: Number(po.totalAmount),
          notes: po.notes,
          items,
        }}
      />
    </div>
  );
}
