"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Loader2,
  Plus,
  Minus,
  Pill,
  Trash2,
  ShoppingBag,
  UserPlus,
  Search,
} from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type Medicine = {
  id: string;
  name: string;
  stockQty: number;
  salePrice: number;
};

type CartItem = {
  rowId: number;
  medicineId: string | null;
  name: string;
  qty: number;
  unitPrice: number;
  stockAvailable: number | null;
};

type PatientHit = {
  id: string;
  name: string;
  mrn: string;
  phone: string;
};

type Mode = "existing" | "walkin";

export function OtcSaleDialog({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: (billId?: string) => void;
}) {
  // Customer side
  const [mode, setMode] = useState<Mode>("walkin");
  const [patient, setPatient] = useState<PatientHit | null>(null);
  const [patientQuery, setPatientQuery] = useState("");
  const [patientHits, setPatientHits] = useState<PatientHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [walkInName, setWalkInName] = useState("");
  const [walkInPhone, setWalkInPhone] = useState("");

  // Cart side
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [medQuery, setMedQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);

  const [paymentMethod, setPaymentMethod] = useState<
    "CASH" | "CARD" | "ONLINE" | "INSURANCE" | "PANEL"
  >("CASH");
  const [received, setReceived] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Inventory once.
  useEffect(() => {
    let alive = true;
    fetch("/api/inventory/medicines?limit=500")
      .then((r) => r.json())
      .then((b) => {
        if (!alive || !b?.success) return;
        setMedicines(
          (b.data as Array<Medicine & { stockQty: number; salePrice: number }>).map(
            (m) => ({
              id: m.id,
              name: m.name,
              stockQty: Number(m.stockQty),
              salePrice: Number(m.salePrice),
            }),
          ),
        );
      })
      .catch(() => {});
    return () => {
      alive = true;
    };
  }, []);

  // Patient search (existing) — debounced.
  useEffect(() => {
    if (mode !== "existing") return;
    const q = patientQuery.trim();
    if (!q) {
      setPatientHits([]);
      return;
    }
    const ac = new AbortController();
    const handle = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `/api/patients?q=${encodeURIComponent(q)}&limit=8`,
          { signal: ac.signal },
        );
        const body = await res.json();
        if (body?.success) {
          setPatientHits(
            body.data.map((p: PatientHit) => ({
              id: p.id,
              name: p.name,
              mrn: p.mrn,
              phone: p.phone,
            })),
          );
        }
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          /* ignore */
        }
      } finally {
        setSearching(false);
      }
    }, 220);
    return () => {
      clearTimeout(handle);
      ac.abort();
    };
  }, [patientQuery, mode]);

  const medFiltered = useMemo(() => {
    const q = medQuery.trim().toLowerCase();
    if (!q) return [];
    return medicines
      .filter((m) => m.name.toLowerCase().includes(q))
      .slice(0, 8);
  }, [medQuery, medicines]);

  function addMedicine(m: Medicine) {
    setCart((prev) => {
      const existing = prev.find((c) => c.medicineId === m.id);
      if (existing) {
        return prev.map((c) =>
          c.medicineId === m.id
            ? { ...c, qty: Math.min(c.qty + 1, m.stockQty) }
            : c,
        );
      }
      return [
        ...prev,
        {
          rowId: (prev.at(-1)?.rowId ?? 0) + 1,
          medicineId: m.id,
          name: m.name,
          qty: m.stockQty > 0 ? 1 : 0,
          unitPrice: m.salePrice,
          stockAvailable: m.stockQty,
        },
      ];
    });
    setMedQuery("");
  }

  function updateRow(rowId: number, patch: Partial<CartItem>) {
    setCart((prev) =>
      prev.map((c) => (c.rowId === rowId ? { ...c, ...patch } : c)),
    );
  }
  function removeRow(rowId: number) {
    setCart((prev) => prev.filter((c) => c.rowId !== rowId));
  }

  const total = cart.reduce((s, c) => s + c.qty * c.unitPrice, 0);
  const receivedNum = received === "" ? total : Number(received);
  const change = receivedNum - total;

  async function submit() {
    // Customer must be set.
    if (mode === "existing" && !patient) {
      toast.error("Pick a patient first");
      return;
    }
    if (mode === "walkin" && !walkInName.trim()) {
      toast.error("Enter walk-in customer's name");
      return;
    }
    if (cart.length === 0 || cart.every((c) => c.qty <= 0)) {
      toast.error("Add at least one medicine");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/pharmacy/otc-sale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: mode === "existing" ? patient?.id : undefined,
          newPatient:
            mode === "walkin"
              ? {
                  name: walkInName.trim(),
                  phone: walkInPhone.trim() || undefined,
                  gender: "OTHER",
                }
              : undefined,
          items: cart
            .filter((c) => c.qty > 0)
            .map((c) => ({
              medicineId: c.medicineId,
              name: c.name,
              qty: c.qty,
              unitPrice: c.unitPrice,
            })),
          paymentMethod,
          amountReceived: received === "" ? undefined : Number(received),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body?.success) {
        toast.error(body?.error ?? "Sale failed");
        return;
      }
      toast.success(`Sale recorded · ${body.data.billNumber}`);
      onDone(body.data.billId);
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
          <DialogTitle className="flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-primary" />
            New OTC sale
          </DialogTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Direct over-the-counter sale — no doctor prescription needed.
          </p>
        </DialogHeader>

        {/* Customer mode toggle */}
        <div className="flex gap-2 rounded-md bg-muted p-1">
          <button
            type="button"
            onClick={() => setMode("walkin")}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition",
              mode === "walkin"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground",
            )}
          >
            <UserPlus className="h-3.5 w-3.5" />
            Walk-in customer
          </button>
          <button
            type="button"
            onClick={() => setMode("existing")}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition",
              mode === "existing"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground",
            )}
          >
            <Search className="h-3.5 w-3.5" />
            Existing patient
          </button>
        </div>

        {mode === "walkin" ? (
          <div className="grid grid-cols-2 gap-2 rounded-lg border bg-muted/30 p-3">
            <div>
              <Label className="text-xs">
                Customer name <span className="text-destructive">*</span>
              </Label>
              <Input
                value={walkInName}
                onChange={(e) => setWalkInName(e.target.value)}
                placeholder="e.g. Ahmad Khan"
                className="mt-1 h-9"
                autoFocus
              />
            </div>
            <div>
              <Label className="text-xs">Phone (optional)</Label>
              <Input
                value={walkInPhone}
                onChange={(e) => setWalkInPhone(e.target.value)}
                placeholder="03xx-xxxxxxx"
                className="mt-1 h-9"
              />
            </div>
            <p className="col-span-2 text-[10px] text-muted-foreground">
              A patient record is created so future visits can be tracked. If
              they come back, search them up under &quot;Existing patient&quot;.
            </p>
          </div>
        ) : (
          <div className="rounded-lg border bg-muted/30 p-3">
            <Label className="text-xs">Search existing patient</Label>
            <div className="relative mt-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={patientQuery}
                onChange={(e) => {
                  setPatientQuery(e.target.value);
                  setPatient(null);
                }}
                placeholder="Name, phone or MRN..."
                className="h-9 pl-8"
              />
            </div>
            {patient ? (
              <div className="mt-2 flex items-center justify-between rounded-md border bg-background px-3 py-2 text-sm">
                <div>
                  <div className="font-medium">{patient.name}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {patient.mrn} · {patient.phone}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPatient(null)}
                >
                  Change
                </Button>
              </div>
            ) : patientQuery && patientHits.length > 0 ? (
              <div className="mt-2 max-h-40 overflow-y-auto rounded-md border bg-background">
                {patientHits.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPatient(p)}
                    className="flex w-full items-center justify-between gap-2 border-b px-3 py-1.5 text-left text-sm last:border-0 hover:bg-accent"
                  >
                    <div>
                      <div className="font-medium">{p.name}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {p.mrn} · {p.phone}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              patientQuery &&
              !searching && (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  No matches. Switch to &quot;Walk-in customer&quot; to register
                  on the spot.
                </p>
              )
            )}
          </div>
        )}

        {/* Medicine search */}
        <div>
          <Label className="text-xs">Add medicine</Label>
          <div className="relative mt-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={medQuery}
              onChange={(e) => setMedQuery(e.target.value)}
              placeholder="Search inventory..."
              className="h-9 pl-8"
            />
          </div>
          {medFiltered.length > 0 && (
            <div className="mt-1 max-h-44 overflow-y-auto rounded-md border bg-background shadow-sm">
              {medFiltered.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => addMedicine(m)}
                  disabled={m.stockQty <= 0}
                  className="flex w-full items-center justify-between gap-2 border-b px-3 py-2 text-left text-sm last:border-0 hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{m.name}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {m.stockQty > 0 ? (
                        <span>
                          ₨ {Math.round(m.salePrice).toLocaleString()} ·{" "}
                          {m.stockQty} in stock
                        </span>
                      ) : (
                        <span className="text-destructive">Out of stock</span>
                      )}
                    </div>
                  </div>
                  <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Cart */}
        <div className="space-y-2">
          {cart.length === 0 ? (
            <div className="rounded-lg border border-dashed bg-muted/20 p-6 text-center text-xs text-muted-foreground">
              No items yet — search above to add medicines.
            </div>
          ) : (
            cart.map((c) => {
              const max = c.stockAvailable ?? 9999;
              const overstock =
                c.stockAvailable !== null && c.qty > c.stockAvailable;
              return (
                <motion.div
                  key={c.rowId}
                  layout
                  className={cn(
                    "flex items-center gap-3 rounded-2xl border bg-card p-3 text-sm",
                    overstock && "border-destructive/40 bg-destructive/5",
                  )}
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                    <Pill className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{c.name}</div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-[11px]">
                      <span className="text-muted-foreground">₨</span>
                      <Input
                        type="number"
                        value={c.unitPrice}
                        onChange={(e) =>
                          updateRow(c.rowId, {
                            unitPrice: Number(e.target.value),
                          })
                        }
                        className="h-6 w-20 px-1.5 text-xs"
                      />
                      <span className="text-muted-foreground">per unit</span>
                      {c.stockAvailable !== null && (
                        <span className="ml-2 text-muted-foreground">
                          · {c.stockAvailable} in stock
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <div className="inline-flex items-center rounded-full border bg-background p-0.5">
                      <button
                        type="button"
                        className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition hover:bg-accent disabled:opacity-30"
                        disabled={c.qty <= 1}
                        onClick={() =>
                          updateRow(c.rowId, { qty: Math.max(1, c.qty - 1) })
                        }
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <div className="min-w-8 text-center text-sm font-semibold tabular-nums">
                        {c.qty}
                      </div>
                      <button
                        type="button"
                        className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition hover:bg-accent disabled:opacity-30"
                        disabled={c.qty >= max}
                        onClick={() =>
                          updateRow(c.rowId, { qty: Math.min(max, c.qty + 1) })
                        }
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="text-sm font-semibold tabular-nums">
                      ₨ {Math.round(c.qty * c.unitPrice).toLocaleString()}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeRow(c.rowId)}
                    className="rounded-full p-1.5 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                    aria-label="Remove"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </motion.div>
              );
            })
          )}
        </div>

        {/* Payment */}
        {cart.length > 0 && (
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
                  onValueChange={(v) =>
                    setPaymentMethod(v as typeof paymentMethod)
                  }
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
        )}

        <DialogFooter className="sm:justify-stretch">
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={submitting || cart.length === 0}
            className="flex-1"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                Selling...
              </>
            ) : (
              <>
                <ShoppingBag className="mr-1.5 h-4 w-4" />
                Complete sale & print receipt
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
