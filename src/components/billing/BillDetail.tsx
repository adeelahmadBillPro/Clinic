"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Printer, MessageCircle, BadgeDollarSign, Loader2, Download } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LogoMark } from "@/components/shared/Logo";
import { whatsappLinkForPhone } from "@/lib/whatsapp";

type BillItem = {
  description: string;
  qty: number;
  unitPrice: number;
  amount: number;
  // Pharmacy bills can carry "not_dispensed" lines (qty=shortBy, amount=0)
  // for items prescribed but unavailable at the in-house pharmacy.
  kind?: "dispensed" | "not_dispensed";
};

type Bill = {
  id: string;
  billNumber: string;
  billType: string;
  status: string;
  items: BillItem[];
  subtotal: number;
  discount: number;
  discountReason: string | null;
  totalAmount: number;
  paidAmount: number;
  balance: number;
  paymentMethod: string | null;
  insuranceInfo: {
    company?: string;
    policyNo?: string;
    coveragePct?: number;
    coveredAmount?: number;
    patientPortion?: number;
  } | null;
  notes: string | null;
  createdAt: string;
};

export function BillDetail({
  bill,
  patient,
  clinic,
  collectorName,
  autoPrint,
}: {
  bill: Bill;
  patient: {
    id: string;
    name: string;
    mrn: string;
    phone: string;
    gender: string;
  } | null;
  clinic: { name: string; phone: string | null; address: string | null; logoUrl: string | null } | null;
  collectorName: string;
  autoPrint: boolean;
}) {
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const [payOpen, setPayOpen] = useState(false);
  const [amount, setAmount] = useState<string>(String(bill.balance));
  const [payMethod, setPayMethod] =
    useState<"CASH" | "CARD" | "ONLINE" | "INSURANCE" | "PANEL">("CASH");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (autoPrint) {
      setTimeout(() => doPrint(), 400);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPrint]);

  function doPrint() {
    window.print();
  }

  const [downloadingPdf, setDownloadingPdf] = useState(false);
  async function doDownload() {
    // PDF is rendered server-side via @react-pdf/renderer — see
    // /api/bills/[id]/pdf. Keeps fonts / layout consistent across
    // devices and avoids shipping html2pdf + html2canvas to every client.
    setDownloadingPdf(true);
    try {
      const res = await fetch(`/api/bills/${bill.id}/pdf`);
      if (!res.ok) throw new Error("bad status");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${bill.billNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Bill PDF downloaded");
    } catch {
      toast.error("Could not generate PDF");
    } finally {
      setDownloadingPdf(false);
    }
  }

  async function recordPayment() {
    const amt = Number(amount);
    if (!(amt > 0)) {
      toast.error("Enter a positive amount");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/billing/${bill.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amt, paymentMethod: payMethod }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body?.success) {
        toast.error(body?.error ?? "Failed to record payment");
        return;
      }
      toast.success("Payment recorded");
      setPayOpen(false);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  // P3-45: bill totals are PHI. Keep them on the clipboard; the wa.me
  // link carries only the phone number.
  const waUrl =
    patient && clinic ? whatsappLinkForPhone(patient.phone) : null;
  const waMessageText =
    patient && clinic
      ? [
          `${clinic.name} — Bill ${bill.billNumber}`,
          ``,
          `Total: ₨ ${Math.round(bill.totalAmount).toLocaleString()}`,
          `Paid:  ₨ ${Math.round(bill.paidAmount).toLocaleString()}`,
          `Balance: ₨ ${Math.round(bill.balance).toLocaleString()}`,
          ``,
          `Thank you!`,
        ].join("\n")
      : "";
  async function handleWhatsAppClick(
    e: React.MouseEvent<HTMLAnchorElement>,
  ) {
    try {
      await navigator.clipboard.writeText(waMessageText);
      toast.success("Message copied. Paste it into WhatsApp.");
    } catch {
      e.preventDefault();
      toast.error("Couldn't copy to clipboard.");
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 no-print">
        <div>
          <div className="font-mono text-xs text-muted-foreground">
            {bill.billNumber}
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Bill · {bill.billType}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={doPrint}>
            <Printer className="mr-1.5 h-3.5 w-3.5" />
            Print
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={doDownload}
            disabled={downloadingPdf}
          >
            {downloadingPdf ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Preparing
              </>
            ) : (
              <>
                <Download className="mr-1.5 h-3.5 w-3.5" />
                PDF
              </>
            )}
          </Button>
          {waUrl && (
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleWhatsAppClick}
              className="inline-flex h-8 items-center gap-1.5 rounded-md bg-emerald-600 px-2.5 text-xs font-medium text-white hover:bg-emerald-700"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              Copy + WhatsApp
            </a>
          )}
          {bill.balance > 0 && (
            <Button size="sm" onClick={() => setPayOpen(true)}>
              <BadgeDollarSign className="mr-1.5 h-3.5 w-3.5" />
              Record payment
            </Button>
          )}
        </div>
      </div>

      <div
        ref={ref}
        className="bill-sheet rounded-xl border bg-card p-6 sm:p-8 auth-card-shadow print:rounded-none print:border-0 print:shadow-none"
      >
        {/* Header */}
        <div className="flex flex-col items-start justify-between gap-4 border-b pb-5 sm:flex-row sm:items-start">
          <div className="flex items-center gap-3">
            <LogoMark className="bill-logo h-10 w-10 shrink-0" />
            <div>
              <div className="text-lg font-bold text-primary">
                {clinic?.name ?? "ClinicOS"}
              </div>
              {clinic?.address && (
                <div className="text-xs text-muted-foreground">
                  {clinic.address}
                </div>
              )}
              {clinic?.phone && (
                <div className="text-xs text-muted-foreground">
                  Tel: {clinic.phone}
                </div>
              )}
            </div>
          </div>
          <div className="text-left sm:text-right">
            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Bill number
            </div>
            <div className="font-mono text-lg font-bold">
              {bill.billNumber}
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              {new Date(bill.createdAt).toLocaleString(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </div>
          </div>
        </div>

        {/* Patient + status */}
        <div className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Billed to
            </div>
            <div className="mt-1 font-medium">{patient?.name ?? "—"}</div>
            {patient && (
              <div className="text-xs text-muted-foreground">
                {patient.mrn} · {patient.phone}
              </div>
            )}
          </div>
          <div className="sm:text-right">
            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Status
            </div>
            <Badge variant="secondary" className="mt-1">
              {bill.status}
            </Badge>
            <div className="mt-1 text-xs text-muted-foreground">
              Collected by {collectorName}
            </div>
          </div>
        </div>

        {/* Items tables — billed (dispensed) and, for pharmacy bills with
            partial dispense, a separate "not dispensed" section so the
            patient leaves with one piece of paper that's complete. Older
            bills don't set `kind` — those default to dispensed. */}
        {(() => {
          const dispensedItems = bill.items.filter(
            (i) => i.kind !== "not_dispensed",
          );
          const notDispensedItems = bill.items.filter(
            (i) => i.kind === "not_dispensed",
          );
          return (
            <>
              <div className="mt-6 overflow-hidden rounded-lg border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/40 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      <th className="px-3 py-2 text-left">Description</th>
                      <th className="w-20 px-3 py-2 text-right">Qty</th>
                      <th className="w-28 px-3 py-2 text-right">Unit</th>
                      <th className="w-32 px-3 py-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dispensedItems.map((i, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="px-3 py-2">{i.description}</td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {i.qty}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          ₨ {Math.round(i.unitPrice).toLocaleString()}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums font-medium">
                          ₨ {Math.round(i.amount).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {notDispensedItems.length > 0 && (
                <div className="mt-4 overflow-hidden rounded-lg border border-amber-500/40 bg-amber-500/5">
                  <div className="border-b border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-amber-800">
                    Not dispensed at this pharmacy — please buy from another
                    pharmacy
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-[10px] font-medium uppercase tracking-wider text-amber-800/70">
                        <th className="px-3 py-2 text-left">Medicine</th>
                        <th className="w-32 px-3 py-2 text-right">Short by</th>
                      </tr>
                    </thead>
                    <tbody>
                      {notDispensedItems.map((i, idx) => (
                        <tr
                          key={idx}
                          className="border-t border-amber-500/20"
                        >
                          <td className="px-3 py-2 text-amber-900">
                            {i.description}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-amber-900">
                            {i.qty}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          );
        })()}

        {/* Totals */}
        <div className="mt-4 flex justify-end">
          <div className="w-full max-w-xs space-y-1.5 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="tabular-nums">
                ₨ {Math.round(bill.subtotal).toLocaleString()}
              </span>
            </div>
            {bill.discount > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  Discount
                  {bill.discountReason && ` (${bill.discountReason})`}
                </span>
                <span className="tabular-nums">
                  − ₨ {Math.round(bill.discount).toLocaleString()}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between border-t pt-2 text-base font-bold">
              <span>Total</span>
              <span className="tabular-nums">
                ₨ {Math.round(bill.totalAmount).toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                Paid ({bill.paymentMethod ?? "—"})
              </span>
              <span className="tabular-nums">
                ₨ {Math.round(bill.paidAmount).toLocaleString()}
              </span>
            </div>
            {bill.balance > 0 && (
              <div className="flex items-center justify-between rounded-md bg-amber-500/10 px-2 py-1 text-sm font-semibold text-amber-700">
                <span>Balance</span>
                <span className="tabular-nums">
                  ₨ {Math.round(bill.balance).toLocaleString()}
                </span>
              </div>
            )}
            {bill.insuranceInfo?.company && (
              <div className="mt-2 rounded bg-muted/50 px-2 py-1 text-[11px] text-muted-foreground">
                Insurance: {bill.insuranceInfo.company} ·{" "}
                {bill.insuranceInfo.coveragePct}% covered · Patient portion ₨{" "}
                {Math.round(
                  bill.insuranceInfo.patientPortion ?? 0,
                ).toLocaleString()}
              </div>
            )}
          </div>
        </div>

        {bill.notes && (
          <div className="mt-4 rounded bg-muted/40 p-3 text-xs text-muted-foreground">
            {bill.notes}
          </div>
        )}

        <div className="mt-8 flex justify-between border-t pt-3 text-xs text-muted-foreground">
          <span>Thank you!</span>
          <span>Generated by ClinicOS</span>
        </div>
      </div>

      {/* Print-specific rules */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .bill-sheet,
          .bill-sheet * {
            visibility: visible;
          }
          .bill-sheet {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 16px !important;
          }
          .bill-logo {
            width: 40px !important;
            height: 40px !important;
            max-width: 40px !important;
            max-height: 40px !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {payOpen && (
        <div
          role="dialog"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 no-print"
          onClick={(e) => {
            if (e.target === e.currentTarget) setPayOpen(false);
          }}
        >
          <div className="w-full max-w-sm rounded-xl border bg-popover p-5 shadow-xl">
            <h3 className="text-sm font-semibold">Record additional payment</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Outstanding balance ₨{" "}
              {Math.round(bill.balance).toLocaleString()}
            </p>
            <div className="mt-3 space-y-3">
              <div>
                <Label>Amount (₨)</Label>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Method</Label>
                <Select
                  value={payMethod}
                  onValueChange={(v) => setPayMethod(v as typeof payMethod)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="CARD">Card</SelectItem>
                    <SelectItem value="ONLINE">Online</SelectItem>
                    <SelectItem value="INSURANCE">Insurance</SelectItem>
                    <SelectItem value="PANEL">Panel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setPayOpen(false)}>
                Cancel
              </Button>
              <Button onClick={recordPayment} disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Saving
                  </>
                ) : (
                  "Record payment"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
