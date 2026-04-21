"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Printer, MessageCircle, BadgeDollarSign, Loader2 } from "lucide-react";
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
import { whatsappLinkForMessage } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";

type BillItem = {
  description: string;
  qty: number;
  unitPrice: number;
  amount: number;
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
    if (autoPrint && ref.current) {
      setTimeout(() => doPrint(), 400);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPrint]);

  function doPrint() {
    const node = ref.current;
    if (!node) return;
    const win = window.open("", "_blank", "width=720,height=900");
    if (!win) return;
    win.document.write(`
      <html>
        <head>
          <title>${bill.billNumber}</title>
          <style>
            body { font-family: system-ui, sans-serif; padding: 32px; color: #0f172a; }
            table { width: 100%; border-collapse: collapse; margin: 16px 0; }
            th, td { text-align: left; padding: 8px 6px; border-bottom: 1px solid #e5e7eb; font-size:13px }
            th { color: #64748b; font-weight: 500; text-transform: uppercase; font-size: 11px; letter-spacing: 0.06em }
            td.num, th.num { text-align:right; font-variant-numeric: tabular-nums }
            .brand { display:flex; gap:10px; align-items:center; font-weight:700; color:#0F6E56; font-size:18px }
            .meta { display:flex; justify-content: space-between; margin: 16px 0; font-size:13px }
            .totals { margin-top: 16px; margin-left: auto; width: 280px }
            .totals div { display:flex; justify-content: space-between; padding: 3px 0; font-size:13px }
            .totals .grand { border-top: 1px solid #cbd5e1; margin-top:6px; padding-top:8px; font-weight:700; font-size:16px }
            .foot { margin-top: 32px; display:flex; justify-content: space-between; font-size:11px; color:#64748b }
            @media print { body { padding:0 } }
          </style>
        </head>
        <body onload="window.print(); setTimeout(()=>window.close(), 300)">
          ${node.innerHTML}
        </body>
      </html>
    `);
    win.document.close();
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

  const waMessage =
    patient &&
    clinic &&
    whatsappLinkForMessage(
      patient.phone,
      [
        `${clinic.name} — Bill ${bill.billNumber}`,
        ``,
        `Total: ₨ ${Math.round(bill.totalAmount).toLocaleString()}`,
        `Paid:  ₨ ${Math.round(bill.paidAmount).toLocaleString()}`,
        `Balance: ₨ ${Math.round(bill.balance).toLocaleString()}`,
        ``,
        `Thank you!`,
      ].join("\n"),
    );

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
          {waMessage && (
            <a
              href={waMessage}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-8 items-center gap-1.5 rounded-md bg-emerald-600 px-2.5 text-xs font-medium text-white hover:bg-emerald-700"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              WhatsApp
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
        className="rounded-xl border bg-card p-8 auth-card-shadow"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="brand flex items-center gap-2.5">
            <LogoMark className="h-8 w-8" />
            <div>
              <div className="text-lg font-bold text-primary">
                {clinic?.name ?? "ClinicOS"}
              </div>
              <div className="text-xs text-muted-foreground">
                {clinic?.address}
              </div>
              <div className="text-xs text-muted-foreground">
                {clinic?.phone}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Bill number
            </div>
            <div className="font-mono text-lg font-bold">
              {bill.billNumber}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {new Date(bill.createdAt).toLocaleString()}
            </div>
          </div>
        </div>

        <div className="meta mt-5 grid gap-4 sm:grid-cols-2 text-sm">
          <div>
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Billed to
            </div>
            <div className="mt-1 font-medium">{patient?.name ?? "—"}</div>
            <div className="text-xs text-muted-foreground">
              {patient?.mrn} · {patient?.phone}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
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

        <table className="mt-4 w-full">
          <thead>
            <tr>
              <th>Description</th>
              <th className="num">Qty</th>
              <th className="num">Unit</th>
              <th className="num">Amount</th>
            </tr>
          </thead>
          <tbody>
            {bill.items.map((i, idx) => (
              <tr key={idx}>
                <td>{i.description}</td>
                <td className="num">{i.qty}</td>
                <td className="num">
                  ₨ {Math.round(i.unitPrice).toLocaleString()}
                </td>
                <td className="num">
                  ₨ {Math.round(i.amount).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="totals ml-auto w-full max-w-xs">
          <div>
            <span className="text-muted-foreground">Subtotal</span>
            <span>₨ {Math.round(bill.subtotal).toLocaleString()}</span>
          </div>
          {bill.discount > 0 && (
            <div>
              <span className="text-muted-foreground">
                Discount{" "}
                {bill.discountReason && `(${bill.discountReason})`}
              </span>
              <span>− ₨ {Math.round(bill.discount).toLocaleString()}</span>
            </div>
          )}
          <div className="grand">
            <span>Total</span>
            <span>₨ {Math.round(bill.totalAmount).toLocaleString()}</span>
          </div>
          <div>
            <span className="text-muted-foreground">
              Paid ({bill.paymentMethod ?? "—"})
            </span>
            <span>₨ {Math.round(bill.paidAmount).toLocaleString()}</span>
          </div>
          {bill.balance > 0 && (
            <div className={cn("font-semibold text-amber-700")}>
              <span>Balance</span>
              <span>₨ {Math.round(bill.balance).toLocaleString()}</span>
            </div>
          )}
          {bill.insuranceInfo?.company && (
            <div className="mt-2 rounded bg-muted/50 px-2 py-1 text-[11px] text-muted-foreground">
              Insurance: {bill.insuranceInfo.company} ·{" "}
              {bill.insuranceInfo.coveragePct}% covered · Patient portion ₨{" "}
              {Math.round(bill.insuranceInfo.patientPortion ?? 0).toLocaleString()}
            </div>
          )}
        </div>

        {bill.notes && (
          <div className="mt-4 rounded bg-muted/40 p-3 text-xs text-muted-foreground">
            {bill.notes}
          </div>
        )}

        <div className="foot mt-8 flex justify-between text-xs text-muted-foreground">
          <span>Thank you!</span>
          <span>Generated by ClinicOS</span>
        </div>
      </div>

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
