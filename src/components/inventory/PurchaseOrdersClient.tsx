"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Plus, Trash2, Loader2, Package, Truck, CheckCircle2, Printer, X } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type PO = {
  id: string;
  poNumber: string;
  status: "DRAFT" | "ORDERED" | "RECEIVED" | "CANCELLED";
  items: Array<{
    medicineId?: string | null;
    name: string;
    qty: number;
    unitPrice: number;
    total?: number;
    receivedQty?: number;
  }>;
  totalAmount: number;
  notes: string | null;
  orderedAt: string | null;
  receivedAt: string | null;
  createdAt: string;
  supplier: { id: string; name: string };
};

const STATUS_COLORS: Record<PO["status"], string> = {
  DRAFT: "bg-slate-500/10 text-slate-700",
  ORDERED: "bg-sky-500/10 text-sky-700",
  RECEIVED: "bg-emerald-500/10 text-emerald-700",
  CANCELLED: "bg-muted text-muted-foreground",
};

type LineForm = { id: number; name: string; qty: number; unitPrice: number };

export function PurchaseOrdersClient({
  initial,
  suppliers,
}: {
  initial: PO[];
  suppliers: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [receiving, setReceiving] = useState<PO | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  async function cancelPO(p: PO) {
    const reason = prompt(
      `Cancel PO ${p.poNumber}? Reason (optional):`,
    );
    if (reason === null) return; // dismissed
    setCancellingId(p.id);
    try {
      const res = await fetch(`/api/inventory/purchase-orders/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel", reason }),
      });
      const body = await res.json();
      if (!res.ok || !body?.success) {
        toast.error(body?.error ?? "Could not cancel");
        return;
      }
      toast.success(`${p.poNumber} cancelled`);
      router.refresh();
    } finally {
      setCancellingId(null);
    }
  }
  const [supplierId, setSupplierId] = useState<string>(suppliers[0]?.id ?? "");
  const [items, setItems] = useState<LineForm[]>([
    { id: 1, name: "", qty: 1, unitPrice: 0 },
  ]);
  const [sendOrdered, setSendOrdered] = useState(false);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const total = items.reduce((s, i) => s + i.qty * i.unitPrice, 0);

  async function save() {
    if (!supplierId) {
      toast.error("Pick a supplier");
      return;
    }
    const valid = items.filter((i) => i.name.trim() && i.qty > 0);
    if (valid.length === 0) {
      toast.error("Add at least one line");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/inventory/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId,
          items: valid.map((i) => ({
            name: i.name,
            qty: i.qty,
            unitPrice: i.unitPrice,
          })),
          notes,
          status: sendOrdered ? "ORDERED" : "DRAFT",
        }),
      });
      const body = await res.json();
      if (!res.ok || !body?.success) {
        toast.error(body?.error ?? "Failed");
        return;
      }
      toast.success(`Created ${body.data.poNumber}`);
      setOpen(false);
      setItems([{ id: 1, name: "", qty: 1, unitPrice: 0 }]);
      setNotes("");
      setSendOrdered(false);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" disabled={suppliers.length === 0}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              New PO
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>New purchase order</DialogTitle>
            </DialogHeader>

            <div>
              <Label>Supplier</Label>
              <Select value={supplierId} onValueChange={(v) => v && setSupplierId(v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-lg border p-3">
              <div className="mb-2 grid grid-cols-[1fr_6ch_8ch_auto] items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                <span>Medicine</span>
                <span className="text-right">Qty</span>
                <span className="text-right">Price</span>
                <span />
              </div>
              <AnimatePresence initial={false}>
                {items.map((i) => (
                  <motion.div
                    key={i.id}
                    layout
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="mb-2 grid grid-cols-[1fr_6ch_8ch_auto] items-center gap-2"
                  >
                    <Input
                      value={i.name}
                      onChange={(e) =>
                        setItems((prev) =>
                          prev.map((x) =>
                            x.id === i.id ? { ...x, name: e.target.value } : x,
                          ),
                        )
                      }
                      placeholder="e.g. Paracetamol 500mg"
                      className="h-9"
                    />
                    <Input
                      type="number"
                      min={0}
                      value={i.qty}
                      onChange={(e) =>
                        setItems((prev) =>
                          prev.map((x) =>
                            x.id === i.id
                              ? { ...x, qty: Number(e.target.value) }
                              : x,
                          ),
                        )
                      }
                      className="h-9 text-right"
                    />
                    <Input
                      type="number"
                      min={0}
                      value={i.unitPrice}
                      onChange={(e) =>
                        setItems((prev) =>
                          prev.map((x) =>
                            x.id === i.id
                              ? { ...x, unitPrice: Number(e.target.value) }
                              : x,
                          ),
                        )
                      }
                      className="h-9 text-right"
                    />
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      disabled={items.length === 1}
                      onClick={() =>
                        setItems((prev) => prev.filter((x) => x.id !== i.id))
                      }
                    >
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </motion.div>
                ))}
              </AnimatePresence>
              <Button
                variant="outline"
                size="xs"
                onClick={() =>
                  setItems((prev) => [
                    ...prev,
                    {
                      id: (prev.at(-1)?.id ?? 0) + 1,
                      name: "",
                      qty: 1,
                      unitPrice: 0,
                    },
                  ])
                }
              >
                <Plus className="mr-1 h-3 w-3" />
                Add line
              </Button>
            </div>

            <div>
              <Label>Notes</Label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-1"
              />
            </div>

            <div className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2 text-sm">
              <span className="text-muted-foreground">Total</span>
              <span className="font-semibold tabular-nums">
                ₨ {Math.round(total).toLocaleString()}
              </span>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                id="sendOrdered"
                checked={sendOrdered}
                onChange={(e) => setSendOrdered(e.target.checked)}
              />
              <Label htmlFor="sendOrdered" className="font-normal">
                Mark as ORDERED (sent to supplier) immediately
              </Label>
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button variant="ghost">Cancel</Button>
              </DialogClose>
              <Button onClick={save} disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Saving
                  </>
                ) : (
                  "Save PO"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {initial.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          No purchase orders yet.
        </div>
      ) : (
        <ul className="space-y-2">
          {initial.map((p) => (
            <li
              key={p.id}
              className="rounded-xl border bg-card p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold">
                      {p.poNumber}
                    </span>
                    <Badge
                      variant="secondary"
                      className={cn(STATUS_COLORS[p.status], "text-[10px]")}
                    >
                      {p.status}
                    </Badge>
                  </div>
                  <div className="mt-1 text-sm font-medium">
                    {p.supplier.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {p.items.length} items · ₨{" "}
                    {Math.round(p.totalAmount).toLocaleString()}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/inventory/purchase-orders/${p.id}`}
                    target="_blank"
                    className="inline-flex h-8 items-center gap-1 rounded-md border bg-card px-2.5 text-xs font-medium hover:bg-accent/60"
                    title="Open / print"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    Print
                  </Link>
                  {p.status === "ORDERED" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setReceiving(p)}
                    >
                      <Package className="mr-1.5 h-3.5 w-3.5" />
                      Receive
                    </Button>
                  )}
                  {(p.status === "DRAFT" || p.status === "ORDERED") && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => cancelPO(p)}
                      disabled={cancellingId === p.id}
                      className="text-destructive hover:bg-destructive/10"
                    >
                      {cancellingId === p.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <X className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  )}
                  {p.status === "RECEIVED" && (
                    <Badge variant="secondary" className="gap-1">
                      <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                      Received
                    </Badge>
                  )}
                  {p.status === "CANCELLED" && (
                    <Badge variant="secondary" className="text-destructive">
                      Cancelled
                    </Badge>
                  )}
                </div>
              </div>
              <div className="mt-2 text-[10px] text-muted-foreground">
                Created {new Date(p.createdAt).toLocaleString()}
              </div>
            </li>
          ))}
        </ul>
      )}

      {receiving && (
        <ReceivePODialog
          po={receiving}
          onClose={() => setReceiving(null)}
          onDone={() => {
            setReceiving(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function ReceivePODialog({
  po,
  onClose,
  onDone,
}: {
  po: PO;
  onClose: () => void;
  onDone: () => void;
}) {
  const [rows, setRows] = useState(
    po.items.map((it, i) => ({
      ...it,
      idx: i,
      receivedQty: it.qty,
      batchNumber: "",
      expiryDate: "",
    })),
  );
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function receive() {
    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/inventory/purchase-orders/${po.id}/receive`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: rows.map((r) => ({
              medicineId: r.medicineId,
              name: r.name,
              qty: r.qty,
              unitPrice: r.unitPrice,
              receivedQty: r.receivedQty,
              batchNumber: r.batchNumber || undefined,
              expiryDate: r.expiryDate || undefined,
            })),
            invoiceNumber: invoiceNumber || undefined,
          }),
        },
      );
      const body = await res.json();
      if (!res.ok || !body?.success) {
        toast.error(body?.error ?? "Failed");
        return;
      }
      toast.success("Goods received");
      onDone();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-4 w-4 text-primary" />
            Receive {po.poNumber}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          {rows.map((r, idx) => (
            <div key={idx} className="rounded-lg border p-3 text-sm">
              <div className="font-medium">{r.name}</div>
              <div className="text-xs text-muted-foreground">
                Ordered {r.qty} @ ₨ {Math.round(r.unitPrice).toLocaleString()}
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-[10px] text-muted-foreground">
                    Received
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    value={r.receivedQty}
                    onChange={(e) =>
                      setRows((prev) =>
                        prev.map((x, i) =>
                          i === idx
                            ? { ...x, receivedQty: Number(e.target.value) }
                            : x,
                        ),
                      )
                    }
                    className="h-8"
                  />
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">
                    Batch
                  </Label>
                  <Input
                    value={r.batchNumber}
                    onChange={(e) =>
                      setRows((prev) =>
                        prev.map((x, i) =>
                          i === idx
                            ? { ...x, batchNumber: e.target.value }
                            : x,
                        ),
                      )
                    }
                    className="h-8"
                  />
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">
                    Expiry
                  </Label>
                  <Input
                    type="date"
                    value={r.expiryDate}
                    onChange={(e) =>
                      setRows((prev) =>
                        prev.map((x, i) =>
                          i === idx ? { ...x, expiryDate: e.target.value } : x,
                        ),
                      )
                    }
                    className="h-8"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div>
          <Label>Invoice number (optional)</Label>
          <Input
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value)}
            className="mt-1"
          />
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Cancel</Button>
          </DialogClose>
          <Button onClick={receive} disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Receiving
              </>
            ) : (
              "Confirm receipt"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
