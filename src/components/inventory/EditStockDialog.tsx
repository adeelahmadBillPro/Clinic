"use client";

import { useState } from "react";
import { Loader2, Package, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";

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
import { Badge } from "@/components/ui/badge";

type Medicine = {
  id: string;
  name: string;
  stockQty: number;
  minStockLevel: number;
  purchasePrice: number;
  salePrice: number;
  unit: string;
  batchNumber: string | null;
  expiryDate: string | null;
};

export function EditStockDialog({
  medicine,
  onClose,
  onSaved,
}: {
  medicine: Medicine;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [mode, setMode] = useState<"ADJUST" | "EDIT">("ADJUST");
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState("");
  const [purchasePrice, setPurchasePrice] = useState(
    String(medicine.purchasePrice),
  );
  const [salePrice, setSalePrice] = useState(String(medicine.salePrice));
  const [minStockLevel, setMinStockLevel] = useState(
    String(medicine.minStockLevel),
  );
  const [submitting, setSubmitting] = useState(false);

  async function save() {
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        purchasePrice: Number(purchasePrice),
        salePrice: Number(salePrice),
        minStockLevel: Number(minStockLevel),
      };
      if (mode === "ADJUST" && delta.trim() !== "") {
        if (!reason.trim()) {
          toast.error("Reason is required for stock adjustment");
          setSubmitting(false);
          return;
        }
        payload.stockAdjustment = {
          delta: Number(delta),
          reason,
        };
      }
      const res = await fetch(`/api/inventory/medicines/${medicine.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body?.success) {
        toast.error(body?.error ?? "Failed");
        return;
      }
      toast.success("Saved");
      onSaved();
    } finally {
      setSubmitting(false);
    }
  }

  async function deactivate() {
    const ok = confirm(
      `Remove ${medicine.name} from inventory? This hides it from future use.`,
    );
    if (!ok) return;
    setSubmitting(true);
    try {
      await fetch(`/api/inventory/medicines/${medicine.id}`, {
        method: "DELETE",
      });
      toast.success("Medicine deactivated");
      onSaved();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" />
            {medicine.name}
          </DialogTitle>
        </DialogHeader>

        <div className="rounded-lg border bg-muted/30 p-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Current stock</span>
            <span className="font-semibold tabular-nums">
              {medicine.stockQty} {medicine.unit}
            </span>
          </div>
          {medicine.batchNumber && (
            <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
              <span>Batch {medicine.batchNumber}</span>
              {medicine.expiryDate && (
                <Badge variant="secondary">
                  Expires{" "}
                  {new Date(medicine.expiryDate).toLocaleDateString()}
                </Badge>
              )}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex gap-1 rounded-md bg-muted p-1 text-xs">
            <button
              onClick={() => setMode("ADJUST")}
              className={`flex-1 rounded px-2 py-1 ${
                mode === "ADJUST" ? "bg-background shadow-sm" : "text-muted-foreground"
              }`}
            >
              Stock adjustment
            </button>
            <button
              onClick={() => setMode("EDIT")}
              className={`flex-1 rounded px-2 py-1 ${
                mode === "EDIT" ? "bg-background shadow-sm" : "text-muted-foreground"
              }`}
            >
              Pricing & reorder level
            </button>
          </div>

          {mode === "ADJUST" ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={Number(delta) > 0 ? "default" : "outline"}
                  onClick={() => setDelta(String(Math.abs(Number(delta) || 0)))}
                >
                  <ArrowUp className="mr-1 h-3 w-3" />
                  Add
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={Number(delta) < 0 ? "default" : "outline"}
                  onClick={() => setDelta(String(-Math.abs(Number(delta) || 0)))}
                >
                  <ArrowDown className="mr-1 h-3 w-3" />
                  Remove
                </Button>
                <Input
                  type="number"
                  value={delta}
                  onChange={(e) => setDelta(e.target.value)}
                  placeholder="Qty"
                  className="flex-1"
                />
              </div>
              <div>
                <Label>Reason</Label>
                <Input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Stock take correction, expired, damaged..."
                  className="mt-1"
                />
              </div>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <Label>Purchase (₨)</Label>
                <Input
                  type="number"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Sale (₨)</Label>
                <Input
                  type="number"
                  value={salePrice}
                  onChange={(e) => setSalePrice(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Reorder at</Label>
                <Input
                  type="number"
                  value={minStockLevel}
                  onChange={(e) => setMinStockLevel(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="sm:justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={deactivate}
            disabled={submitting}
            className="text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Remove
          </Button>
          <div className="flex gap-2">
            <DialogClose asChild>
              <Button variant="ghost" disabled={submitting}>
                Cancel
              </Button>
            </DialogClose>
            <Button onClick={save} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Saving
                </>
              ) : (
                "Save"
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
