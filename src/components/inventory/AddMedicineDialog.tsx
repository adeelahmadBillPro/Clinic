"use client";

import { useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CATEGORIES = [
  "Tablet",
  "Syrup",
  "Injection",
  "Drops",
  "Cream",
  "Capsule",
  "Inhaler",
  "Other",
];
const UNITS = ["tablet", "capsule", "ml", "mg", "g", "unit", "vial", "bottle"];

export function AddMedicineDialog({ onCreated }: { onCreated?: () => void }) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: "",
    genericName: "",
    category: "Tablet",
    unit: "tablet",
    stockQty: "",
    minStockLevel: "10",
    purchasePrice: "",
    salePrice: "",
    batchNumber: "",
    expiryDate: "",
    location: "",
  });

  function update(k: keyof typeof form, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function save() {
    if (!form.name.trim() || !form.purchasePrice || !form.salePrice) {
      toast.error("Name, purchase and sale price are required");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/inventory/medicines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          genericName: form.genericName || undefined,
          stockQty: Number(form.stockQty) || 0,
          minStockLevel: Number(form.minStockLevel) || 10,
          purchasePrice: Number(form.purchasePrice),
          salePrice: Number(form.salePrice),
          batchNumber: form.batchNumber || undefined,
          expiryDate: form.expiryDate || undefined,
          location: form.location || undefined,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body?.success) {
        toast.error(body?.error ?? "Failed to add medicine");
        return;
      }
      toast.success(`${form.name} added to inventory`);
      setOpen(false);
      onCreated?.();
      setForm({
        name: "",
        genericName: "",
        category: "Tablet",
        unit: "tablet",
        stockQty: "",
        minStockLevel: "10",
        purchasePrice: "",
        salePrice: "",
        batchNumber: "",
        expiryDate: "",
        location: "",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add medicine
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add to inventory</DialogTitle>
          <DialogDescription>
            A new medicine entry with opening stock.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Name</Label>
            <Input
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="Paracetamol 500mg"
              className="mt-1"
            />
          </div>
          <div className="sm:col-span-2">
            <Label>Generic name</Label>
            <Input
              value={form.genericName}
              onChange={(e) => update("genericName", e.target.value)}
              placeholder="Paracetamol"
              className="mt-1"
            />
          </div>
          <div>
            <Label>Category</Label>
            <Select
              value={form.category}
              onValueChange={(v) => update("category", v as string)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Unit</Label>
            <Select
              value={form.unit}
              onValueChange={(v) => update("unit", v as string)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {UNITS.map((u) => (
                  <SelectItem key={u} value={u}>
                    {u}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Opening stock</Label>
            <Input
              type="number"
              min={0}
              value={form.stockQty}
              onChange={(e) => update("stockQty", e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Min level (reorder at)</Label>
            <Input
              type="number"
              min={0}
              value={form.minStockLevel}
              onChange={(e) => update("minStockLevel", e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Purchase price (₨)</Label>
            <Input
              type="number"
              min={0}
              value={form.purchasePrice}
              onChange={(e) => update("purchasePrice", e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Sale price (₨)</Label>
            <Input
              type="number"
              min={0}
              value={form.salePrice}
              onChange={(e) => update("salePrice", e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Batch number</Label>
            <Input
              value={form.batchNumber}
              onChange={(e) => update("batchNumber", e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Expiry date</Label>
            <Input
              type="date"
              value={form.expiryDate}
              onChange={(e) => update("expiryDate", e.target.value)}
              className="mt-1"
            />
          </div>
          <div className="sm:col-span-2">
            <Label>Shelf location</Label>
            <Input
              value={form.location}
              onChange={(e) => update("location", e.target.value)}
              placeholder="Rack A-3"
              className="mt-1"
            />
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost" disabled={submitting}>
              Cancel
            </Button>
          </DialogClose>
          <Button onClick={save} disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Adding
              </>
            ) : (
              "Add medicine"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
