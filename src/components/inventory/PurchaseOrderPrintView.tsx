"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

type Item = {
  name: string;
  qty: number;
  unitPrice: number;
  receivedQty?: number;
};

type Props = {
  clinic: { name: string; phone: string | null; address: string | null };
  supplier: {
    name: string;
    contactPerson: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
  } | null;
  po: {
    poNumber: string;
    status: string;
    createdAt: string;
    expectedDate: string | null;
    receivedAt: string | null;
    totalAmount: number;
    notes: string | null;
    items: Item[];
  };
};

const STATUS_TONE: Record<string, string> = {
  DRAFT: "bg-slate-500/10 text-slate-700",
  ORDERED: "bg-amber-500/10 text-amber-800",
  RECEIVED: "bg-emerald-500/10 text-emerald-700",
  CANCELLED: "bg-destructive/10 text-destructive",
};

export function PurchaseOrderPrintView(props: Props) {
  function print() {
    window.print();
  }

  const { po, supplier, clinic } = props;
  const d = new Date(po.createdAt);

  return (
    <div>
      <div className="no-print mb-4 flex items-center justify-end gap-2">
        <Button onClick={print}>
          <Printer className="mr-1.5 h-4 w-4" />
          Print / Save as PDF
        </Button>
      </div>

      <div className="po-sheet rounded-xl border bg-white p-8 text-black shadow-sm print:rounded-none print:border-0 print:shadow-none">
        {/* Header */}
        <div className="flex items-start justify-between border-b-2 border-emerald-700 pb-4">
          <div>
            <div className="text-xl font-bold text-emerald-800">
              {clinic.name}
            </div>
            {clinic.address && (
              <div className="text-xs text-gray-600">{clinic.address}</div>
            )}
            {clinic.phone && (
              <div className="text-xs text-gray-600">Tel: {clinic.phone}</div>
            )}
          </div>
          <div className="text-right">
            <div className="text-[10px] font-medium uppercase tracking-widest text-gray-500">
              Purchase Order
            </div>
            <div className="font-mono text-xl font-bold">{po.poNumber}</div>
            <div className="mt-0.5 text-xs text-gray-600">
              {d.toLocaleDateString(undefined, {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </div>
            <span
              className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                STATUS_TONE[po.status] ?? "bg-muted"
              }`}
            >
              {po.status}
            </span>
          </div>
        </div>

        {/* Supplier + meta */}
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="rounded-md bg-emerald-50 p-3 text-sm">
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-600">
              Supplier
            </div>
            {supplier ? (
              <>
                <div className="font-semibold">{supplier.name}</div>
                {supplier.contactPerson && (
                  <div className="text-xs text-gray-600">
                    {supplier.contactPerson}
                  </div>
                )}
                {supplier.phone && (
                  <div className="text-xs text-gray-600">
                    Tel: {supplier.phone}
                  </div>
                )}
                {supplier.email && (
                  <div className="text-xs text-gray-600">{supplier.email}</div>
                )}
                {supplier.address && (
                  <div className="text-xs text-gray-600">
                    {supplier.address}
                  </div>
                )}
              </>
            ) : (
              <div className="italic text-gray-500">
                Supplier details unavailable
              </div>
            )}
          </div>
          <div className="rounded-md bg-muted/40 p-3 text-sm">
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-600">
              Details
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Order date</span>
              <span>{d.toLocaleDateString()}</span>
            </div>
            {po.expectedDate && (
              <div className="flex justify-between">
                <span className="text-gray-600">Expected</span>
                <span>{new Date(po.expectedDate).toLocaleDateString()}</span>
              </div>
            )}
            {po.receivedAt && (
              <div className="flex justify-between">
                <span className="text-gray-600">Received</span>
                <span>{new Date(po.receivedAt).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        </div>

        {/* Items */}
        <div className="mt-6 overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40 text-[10px] font-medium uppercase tracking-wider text-gray-600">
                <th className="w-12 px-3 py-2 text-left">#</th>
                <th className="px-3 py-2 text-left">Item</th>
                <th className="w-20 px-3 py-2 text-right">Qty</th>
                <th className="w-28 px-3 py-2 text-right">Unit</th>
                <th className="w-32 px-3 py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {po.items.map((it, i) => (
                <tr key={i} className="border-t">
                  <td className="px-3 py-2 text-gray-500">{i + 1}</td>
                  <td className="px-3 py-2">
                    <div className="font-medium">{it.name}</div>
                    {it.receivedQty !== undefined &&
                      it.receivedQty !== it.qty && (
                        <div className="text-[10px] text-amber-700">
                          Received: {it.receivedQty}
                        </div>
                      )}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {it.qty}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    ₨ {Math.round(it.unitPrice).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-right font-medium tabular-nums">
                    ₨ {Math.round(it.qty * it.unitPrice).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Total */}
        <div className="mt-3 flex justify-end">
          <div className="w-full max-w-xs rounded-md bg-emerald-50 p-3">
            <div className="flex items-center justify-between text-base font-bold">
              <span>Total</span>
              <span className="tabular-nums">
                ₨ {Math.round(po.totalAmount).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {po.notes && (
          <div className="mt-4 rounded-md bg-muted/40 p-3 text-xs text-gray-700">
            <div className="mb-0.5 font-semibold text-gray-600">Notes</div>
            {po.notes}
          </div>
        )}

        {/* Signatures */}
        <div className="mt-10 grid grid-cols-2 gap-10 text-xs">
          <div>
            <div className="mb-10 h-8 border-b border-gray-300" />
            <div className="font-semibold">Ordered by</div>
            <div className="text-[10px] text-gray-500">Clinic signature</div>
          </div>
          <div>
            <div className="mb-10 h-8 border-b border-gray-300" />
            <div className="font-semibold">Received by</div>
            <div className="text-[10px] text-gray-500">Supplier signature</div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body {
            background: white !important;
          }
          body * {
            visibility: hidden;
          }
          .po-sheet,
          .po-sheet * {
            visibility: visible;
          }
          .po-sheet {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 16px !important;
            border: 0 !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
