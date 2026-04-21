"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Loader2,
  Banknote,
  Copy,
  CheckCircle2,
  Building2,
  Smartphone,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type PaymentMethod = "BANK_TRANSFER" | "JAZZCASH" | "EASYPAISA" | "CASH";

const PAYMENT_METHODS: Array<{
  v: PaymentMethod;
  label: string;
  icon: typeof Banknote;
}> = [
  { v: "BANK_TRANSFER", label: "Bank Transfer", icon: Building2 },
  { v: "JAZZCASH", label: "JazzCash", icon: Smartphone },
  { v: "EASYPAISA", label: "Easypaisa", icon: Smartphone },
  { v: "CASH", label: "Cash", icon: Banknote },
];

const PAY_TO = {
  BANK_TRANSFER: {
    title: "Bank Transfer",
    details: [
      { label: "Bank", value: "Meezan Bank" },
      { label: "Title", value: "ClinicOS (Pvt.) Ltd." },
      { label: "Account", value: "1234-5678-9012-3456" },
      { label: "IBAN", value: "PK12 MEZN 0001 2345 6789 0123" },
    ],
  },
  JAZZCASH: {
    title: "JazzCash",
    details: [
      { label: "Title", value: "ClinicOS" },
      { label: "Number", value: "0300-1234567" },
    ],
  },
  EASYPAISA: {
    title: "Easypaisa",
    details: [
      { label: "Title", value: "ClinicOS" },
      { label: "Number", value: "0345-1234567" },
    ],
  },
  CASH: {
    title: "Cash",
    details: [
      {
        label: "Pay at",
        value: "Visit our office or contact support to arrange pickup",
      },
    ],
  },
};

const PRICES: Record<
  string,
  { monthly: number; yearly: number; oneTime: number }
> = {
  BASIC: { monthly: 3000, yearly: 30000, oneTime: 9000 },
  STANDARD: { monthly: 7500, yearly: 75000, oneTime: 22500 },
  PRO: { monthly: 15000, yearly: 150000, oneTime: 45000 },
};

export function ManualUpgradeDialog({
  open,
  onOpenChange,
  planName,
  cycle,
  onSubmitted,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  planName: "BASIC" | "STANDARD" | "PRO";
  cycle: "monthly" | "yearly" | "oneTime";
  onSubmitted?: () => void;
}) {
  const [method, setMethod] = useState<PaymentMethod>("BANK_TRANSFER");
  const [refNumber, setRefNumber] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const price = PRICES[planName]?.[cycle] ?? 0;
  const payTo = PAY_TO[method];

  function copyValue(value: string, label: string) {
    navigator.clipboard.writeText(value);
    setCopied(label);
    setTimeout(() => setCopied(null), 1800);
  }

  async function submit() {
    if (!refNumber.trim()) {
      toast.error("Enter the transaction reference number");
      return;
    }
    if (!amountPaid || Number(amountPaid) <= 0) {
      toast.error("Enter the amount you paid");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/upgrade-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planName,
          cycle,
          method,
          referenceNumber: refNumber.trim(),
          amountPaid: Number(amountPaid),
          notes,
        }),
      });
      const body = await res.json();
      if (!res.ok || !body?.success) {
        toast.error(body?.error ?? "Request failed");
        return;
      }
      toast.success(
        body.data?.message ??
          "We'll verify and activate within 24 hours.",
      );
      onSubmitted?.();
      onOpenChange(false);
      setRefNumber("");
      setAmountPaid("");
      setNotes("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Banknote className="h-4 w-4 text-primary" />
            Upgrade to {planName} · ₨ {price.toLocaleString()}
          </DialogTitle>
        </DialogHeader>

        <div className="rounded-lg border border-primary/25 bg-primary/5 p-3 text-xs text-muted-foreground">
          Pay the amount using any method below, then fill the form to log
          your payment. Our team verifies and activates your plan within
          24&nbsp;hours.
        </div>

        <div>
          <Label>Payment method</Label>
          <div className="mt-1.5 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            {PAYMENT_METHODS.map((m) => {
              const Icon = m.icon;
              const active = method === m.v;
              return (
                <button
                  key={m.v}
                  type="button"
                  onClick={() => setMethod(m.v)}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-lg border p-2.5 text-xs font-medium transition",
                    active
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "bg-background hover:border-primary/40 hover:bg-accent",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Pay-to details with copy buttons */}
        <div className="rounded-lg border bg-muted/30 p-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Pay to — {payTo.title}
          </div>
          <div className="mt-2 space-y-1.5">
            {payTo.details.map((d, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <span className="text-muted-foreground">{d.label}</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-xs font-medium">
                    {d.value}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyValue(d.value, d.label)}
                    className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                    aria-label={`Copy ${d.label}`}
                  >
                    {copied === d.label ? (
                      <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Proof form */}
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Amount paid (₨)</Label>
              <Input
                type="number"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                placeholder={String(price)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Transaction reference</Label>
              <Input
                value={refNumber}
                onChange={(e) => setRefNumber(e.target.value)}
                placeholder="TRX-123456"
                className="mt-1"
              />
            </div>
          </div>
          <div>
            <Label>Notes (optional)</Label>
            <Textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 resize-none"
              placeholder="Paid from XYZ bank account, please activate ASAP..."
            />
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost" disabled={submitting}>
              Cancel
            </Button>
          </DialogClose>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Submitting
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                Submit payment proof
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
