"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Printer } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AllergyBanner } from "@/components/shared/AllergyBanner";
import type { PharmacyOrder } from "./PharmacyQueue";
import { cn } from "@/lib/utils";

type DispenseRow = {
  medicineId: string | null;
  name: string;
  requestedQty: number;
  dispensedQty: number;
  unitPrice: number;
  stockAvailable: number | null;
};

export function DispenseDialog({
  order,
  onClose,
  onDone,
}: {
  order: PharmacyOrder;
  onClose: () => void;
  onDone: () => void;
}) {
  const [rows, setRows] = useState<DispenseRow[]>(() =>
    order.items.map((i) => ({
      medicineId: i.medicineId ?? null,
      name: i.name,
      requestedQty: i.qty ?? 0,
      dispensedQty: i.qty ?? 0,
      unitPrice: i.unitPrice ?? 0,
      stockAvailable: null,
    })),
  );
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] =
    useState<"CASH" | "CARD" | "ONLINE" | "INSURANCE" | "PANEL">("CASH");
  const [received, setReceived] = useState<string>("");

  // Fetch stock + price for each medicine
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const res = await fetch("/api/inventory/medicines?limit=500");
      const body = await res.json();
      if (!body?.success || cancelled) {
        setLoading(false);
        return;
      }
      const byId = new Map<string, { stockQty: number; salePrice: number }>();
      const byName = new Map<string, { stockQty: number; salePrice: number; id: string }>();
      for (const m of body.data) {
        byId.set(m.id, { stockQty: m.stockQty, salePrice: m.salePrice });
        byName.set(m.name.toLowerCase(), {
          stockQty: m.stockQty,
          salePrice: m.salePrice,
          id: m.id,
        });
      }
      setRows((prev) =>
        prev.map((r) => {
          const direct = r.medicineId ? byId.get(r.medicineId) : null;
          const hit = direct ?? byName.get(r.name.toLowerCase()) ?? null;
          return {
            ...r,
            medicineId: r.medicineId ?? (hit ? byName.get(r.name.toLowerCase())?.id ?? null : null),
            stockAvailable: hit?.stockQty ?? null,
            unitPrice: r.unitPrice || hit?.salePrice || 0,
          };
        }),
      );
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function updateRow(i: number, patch: Partial<DispenseRow>) {
    setRows((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], ...patch };
      return next;
    });
  }

  const total = rows.reduce(
    (sum, r) => sum + r.dispensedQty * r.unitPrice,
    0,
  );
  const receivedNum = received === "" ? total : Number(received);
  const change = receivedNum - total;

  async function dispense() {
    if (!rows.some((r) => r.dispensedQty > 0)) {
      toast.error("Select at least one item to dispense");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/pharmacy/orders/${order.id}/dispense`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: rows.map((r) => ({
            medicineId: r.medicineId,
            name: r.name,
            qty: r.requestedQty,
            dispensedQty: r.dispensedQty,
            unitPrice: r.unitPrice,
          })),
          paymentMethod,
          amountReceived:
            received === "" ? undefined : Number(received),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body?.success) {
        toast.error(body?.error ?? "Dispense failed");
        return;
      }
      toast.success(`Dispensed · ${body.data.billNumber}`);
      onDone();
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Dispense{" "}
            <span className="font-mono text-sm text-muted-foreground">
              {order.orderNumber}
            </span>
          </DialogTitle>
        </DialogHeader>

        {order.patient && (
          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{order.patient.name}</div>
                <div className="text-xs text-muted-foreground">
                  {order.patient.mrn} · {order.patient.phone}
                </div>
              </div>
              <Badge variant="secondary">{order.status}</Badge>
            </div>
            {order.patient.allergies && order.patient.allergies.length > 0 && (
              <div className="mt-2">
                <AllergyBanner allergies={order.patient.allergies} />
              </div>
            )}
          </div>
        )}

        <div className="space-y-2">
          {rows.map((r, i) => {
            const outOfStock =
              r.stockAvailable !== null && r.stockAvailable === 0;
            const partial =
              r.stockAvailable !== null &&
              r.stockAvailable > 0 &&
              r.stockAvailable < r.requestedQty;
            return (
              <motion.div
                key={i}
                layout
                className={cn(
                  "rounded-lg border p-3 text-sm",
                  outOfStock && "border-destructive/30 bg-destructive/5",
                  partial && !outOfStock && "border-amber-500/30 bg-amber-500/5",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium">{r.name}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      Requested <span className="font-medium text-foreground">{r.requestedQty}</span>{" "}
                      {loading ? (
                        <Loader2 className="ml-1 inline h-3 w-3 animate-spin" />
                      ) : r.stockAvailable === null ? (
                        <span className="text-muted-foreground">
                          · not in inventory (manual)
                        </span>
                      ) : outOfStock ? (
                        <span className="text-destructive">· out of stock</span>
                      ) : partial ? (
                        <span className="text-amber-700">
                          · only {r.stockAvailable} in stock
                        </span>
                      ) : (
                        <span className="text-emerald-700">
                          · {r.stockAvailable} in stock
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-[10px] text-muted-foreground">
                      Dispense qty
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      max={
                        r.stockAvailable !== null
                          ? r.stockAvailable
                          : undefined
                      }
                      value={r.dispensedQty}
                      onChange={(e) =>
                        updateRow(i, { dispensedQty: Number(e.target.value) })
                      }
                      className="h-8"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">
                      Unit price (₨)
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      value={r.unitPrice}
                      onChange={(e) =>
                        updateRow(i, { unitPrice: Number(e.target.value) })
                      }
                      className="h-8"
                    />
                  </div>
                  <div className="flex flex-col justify-end text-right text-xs">
                    <div className="text-muted-foreground">Subtotal</div>
                    <div className="font-semibold tabular-nums">
                      ₨ {Math.round(r.dispensedQty * r.unitPrice).toLocaleString()}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="space-y-3 rounded-lg border bg-muted/30 p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total</span>
            <span className="text-xl font-semibold tabular-nums">
              ₨ {Math.round(total).toLocaleString()}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Payment method</Label>
              <Select
                value={paymentMethod}
                onValueChange={(v) => setPaymentMethod(v as typeof paymentMethod)}
              >
                <SelectTrigger className="mt-1 h-9">
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
                placeholder={String(Math.round(total))}
                value={received}
                onChange={(e) => setReceived(e.target.value)}
                className="mt-1 h-9"
              />
            </div>
          </div>
          {received !== "" && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Change</span>
              <span
                className={cn(
                  "font-semibold",
                  change < 0 && "text-destructive",
                  change > 0 && "text-emerald-600",
                )}
              >
                ₨ {Math.round(Math.abs(change)).toLocaleString()}
              </span>
            </div>
          )}
        </div>

        <DialogFooter className="sm:justify-stretch">
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={dispense}
            disabled={submitting || loading}
            className="flex-1"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                Dispensing...
              </>
            ) : (
              <>
                <Printer className="mr-1.5 h-4 w-4" />
                Dispense & generate receipt
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
