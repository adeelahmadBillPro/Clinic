"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Plus, Trash2, Tag } from "lucide-react";
import { toast } from "sonner";

import {
  PatientSearch,
  type PatientHit,
} from "@/components/patients/PatientSearch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type LineItem = { id: number; description: string; qty: number; unitPrice: number };

export function NewBillForm() {
  const router = useRouter();
  const [patient, setPatient] = useState<PatientHit | null>(null);
  const [billType, setBillType] =
    useState<"OPD" | "PHARMACY" | "LAB" | "IPD">("OPD");
  const [items, setItems] = useState<LineItem[]>([
    { id: 1, description: "", qty: 1, unitPrice: 0 },
  ]);
  const [discount, setDiscount] = useState("");
  const [discountPct, setDiscountPct] = useState("");
  const [discountReason, setDiscountReason] = useState("");
  const [paymentMethod, setPaymentMethod] =
    useState<"CASH" | "CARD" | "ONLINE" | "INSURANCE" | "PANEL">("CASH");
  const [paidAmount, setPaidAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [insurance, setInsurance] = useState({
    company: "",
    policyNo: "",
    coveragePct: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const subtotal = useMemo(
    () => items.reduce((s, i) => s + i.qty * i.unitPrice, 0),
    [items],
  );

  const computedDiscount = useMemo(() => {
    const pct = Number(discountPct);
    if (pct > 0 && pct <= 100) return Math.round((subtotal * pct) / 100);
    return Number(discount) || 0;
  }, [discount, discountPct, subtotal]);

  const total = Math.max(0, subtotal - computedDiscount);
  const paid = Number(paidAmount) || 0;
  const balance = Math.max(0, total - paid);

  function update(id: number, patch: Partial<LineItem>) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }
  function addRow() {
    setItems((prev) => [
      ...prev,
      { id: (prev.at(-1)?.id ?? 0) + 1, description: "", qty: 1, unitPrice: 0 },
    ]);
  }
  function removeRow(id: number) {
    setItems((prev) =>
      prev.length === 1 ? prev : prev.filter((i) => i.id !== id),
    );
  }

  async function submit() {
    if (!patient) {
      toast.error("Pick a patient first");
      return;
    }
    if (items.some((i) => !i.description.trim() || i.qty <= 0)) {
      toast.error("Complete all line items");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: patient.id,
          billType,
          items: items.map((i) => ({
            description: i.description,
            qty: i.qty,
            unitPrice: i.unitPrice,
          })),
          discount: computedDiscount,
          discountReason: computedDiscount > 0 ? discountReason : undefined,
          paymentMethod,
          insuranceInfo:
            paymentMethod === "INSURANCE"
              ? {
                  company: insurance.company,
                  policyNo: insurance.policyNo,
                  coveragePct: Number(insurance.coveragePct) || 0,
                }
              : undefined,
          paidAmount: paid,
          notes,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body?.success) {
        toast.error(body?.error ?? "Could not save bill");
        return;
      }
      toast.success(`Bill generated — ${body.data.billNumber}`);
      router.push(`/billing/${body.data.id}?print=1`);
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <div className="space-y-4">
        <div className="rounded-xl border bg-card p-4">
          <Label className="text-xs text-muted-foreground">Patient</Label>
          {patient ? (
            <div className="mt-1.5 flex items-center justify-between gap-3 rounded-lg border bg-muted/30 p-3">
              <div>
                <div className="font-medium">{patient.name}</div>
                <div className="text-xs text-muted-foreground">
                  {patient.mrn} · {patient.phone}
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setPatient(null)}
              >
                Change
              </Button>
            </div>
          ) : (
            <div className="mt-1.5">
              <PatientSearch onSelect={setPatient} />
            </div>
          )}
        </div>

        <div className="rounded-xl border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <Label className="text-xs text-muted-foreground">
                Bill type
              </Label>
              <Select
                value={billType}
                onValueChange={(v) => setBillType(v as typeof billType)}
              >
                <SelectTrigger className="mt-1 w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OPD">OPD</SelectItem>
                  <SelectItem value="PHARMACY">Pharmacy</SelectItem>
                  <SelectItem value="LAB">Lab</SelectItem>
                  <SelectItem value="IPD">IPD</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addRow}>
              <Plus className="mr-1 h-3 w-3" />
              Add line
            </Button>
          </div>
          <div className="space-y-2">
            <div className="grid grid-cols-[1fr_6ch_9ch_auto] items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
              <span>Description</span>
              <span className="text-right">Qty</span>
              <span className="text-right">Price</span>
              <span />
            </div>
            <AnimatePresence initial={false}>
              {items.map((i) => (
                <motion.div
                  key={i.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="grid grid-cols-[1fr_6ch_9ch_auto] items-center gap-2"
                >
                  <Input
                    value={i.description}
                    onChange={(e) => update(i.id, { description: e.target.value })}
                    placeholder="Consultation, procedure, item..."
                    className="h-9"
                  />
                  <Input
                    type="number"
                    min={0}
                    value={i.qty}
                    onChange={(e) =>
                      update(i.id, { qty: Number(e.target.value) })
                    }
                    className="h-9 text-right"
                  />
                  <Input
                    type="number"
                    min={0}
                    value={i.unitPrice}
                    onChange={(e) =>
                      update(i.id, { unitPrice: Number(e.target.value) })
                    }
                    className="h-9 text-right"
                  />
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Remove"
                    onClick={() => removeRow(i.id)}
                    disabled={items.length === 1}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Tag className="h-3.5 w-3.5 text-muted-foreground" />
            Discount
          </div>
          <div className="grid gap-3 sm:grid-cols-[auto_auto_1fr]">
            <div>
              <Label className="text-[11px] text-muted-foreground">Flat (₨)</Label>
              <Input
                type="number"
                min={0}
                value={discount}
                onChange={(e) => {
                  setDiscount(e.target.value);
                  setDiscountPct("");
                }}
                className="mt-1 w-28"
              />
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground">Percent (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={discountPct}
                onChange={(e) => {
                  setDiscountPct(e.target.value);
                  setDiscount("");
                }}
                className="mt-1 w-28"
              />
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground">
                Reason (required when discount &gt; 0)
              </Label>
              <Input
                value={discountReason}
                onChange={(e) => setDiscountReason(e.target.value)}
                placeholder="e.g. Returning patient, senior citizen"
                className="mt-1"
              />
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-4">
          <div className="mb-3 text-sm font-semibold">Payment</div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-xs">Method</Label>
              <Select
                value={paymentMethod}
                onValueChange={(v) =>
                  setPaymentMethod(v as typeof paymentMethod)
                }
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
            <div>
              <Label className="text-xs">Amount received (₨)</Label>
              <Input
                type="number"
                min={0}
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
                className="mt-1"
                placeholder={String(total)}
              />
            </div>
          </div>
          {paymentMethod === "INSURANCE" && (
            <div className="mt-3 grid gap-3 rounded-lg border bg-muted/30 p-3 sm:grid-cols-3">
              <div>
                <Label className="text-[11px] text-muted-foreground">
                  Company
                </Label>
                <Input
                  value={insurance.company}
                  onChange={(e) =>
                    setInsurance((v) => ({ ...v, company: e.target.value }))
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-[11px] text-muted-foreground">
                  Policy #
                </Label>
                <Input
                  value={insurance.policyNo}
                  onChange={(e) =>
                    setInsurance((v) => ({ ...v, policyNo: e.target.value }))
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-[11px] text-muted-foreground">
                  Coverage %
                </Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={insurance.coveragePct}
                  onChange={(e) =>
                    setInsurance((v) => ({
                      ...v,
                      coveragePct: e.target.value,
                    }))
                  }
                  className="mt-1"
                />
              </div>
            </div>
          )}
          <Label className="mt-3 block text-xs">Notes (optional)</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="mt-1 resize-none"
          />
        </div>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-20">
        <div className="rounded-xl border bg-card p-4">
          <div className="text-sm font-semibold">Summary</div>
          <dl className="mt-3 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd className="tabular-nums">
                ₨ {Math.round(subtotal).toLocaleString()}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Discount</dt>
              <dd className="tabular-nums">
                − ₨ {Math.round(computedDiscount).toLocaleString()}
              </dd>
            </div>
            <div className="flex justify-between border-t pt-1.5 font-semibold">
              <dt>Total</dt>
              <dd className="tabular-nums">
                ₨ {Math.round(total).toLocaleString()}
              </dd>
            </div>
            <div className="flex justify-between text-emerald-700">
              <dt>Paid</dt>
              <dd className="tabular-nums">
                ₨ {Math.round(paid).toLocaleString()}
              </dd>
            </div>
            <div
              className={cn(
                "flex justify-between",
                balance > 0 && "text-amber-700",
              )}
            >
              <dt>Balance</dt>
              <dd className="tabular-nums">
                ₨ {Math.round(balance).toLocaleString()}
              </dd>
            </div>
          </dl>
          <Button
            onClick={submit}
            disabled={submitting || !patient}
            size="lg"
            className="mt-4 w-full"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>Generate bill</>
            )}
          </Button>
          {balance > 0 && (
            <div className="mt-2 flex items-center justify-center gap-1 text-xs">
              <Badge variant="secondary">Will be saved as PARTIAL</Badge>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
