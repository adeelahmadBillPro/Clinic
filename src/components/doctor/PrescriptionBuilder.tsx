"use client";

import { useEffect, useState, useCallback } from "react";
import { X, Plus, Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";
import type { MedicineItem } from "@/lib/validations/consultation";
import { cn } from "@/lib/utils";

const FREQUENCIES = ["OD", "BD", "TDS", "QID", "PRN", "HS", "Stat"];
const DURATIONS = ["3 days", "5 days", "7 days", "10 days", "14 days", "1 month"];
const ROUTES = ["Oral", "IV", "IM", "SC", "Topical", "Inhalation", "PR", "PV"];

const TEMPLATES: Record<string, MedicineItem[]> = {
  Flu: [
    { name: "Paracetamol 500mg", dose: "1 tablet", frequency: "TDS", duration: "5 days", route: "Oral", qty: 15 },
    { name: "Cetirizine 10mg", dose: "1 tablet", frequency: "HS", duration: "5 days", route: "Oral", qty: 5 },
  ],
  Hypertension: [
    { name: "Amlodipine 5mg", dose: "1 tablet", frequency: "OD", duration: "1 month", route: "Oral", qty: 30 },
  ],
  Diabetes: [
    { name: "Metformin 500mg", dose: "1 tablet", frequency: "BD", duration: "1 month", route: "Oral", qty: 60 },
  ],
  Antibiotics: [
    {
      name: "Amoxicillin 500mg",
      dose: "1 capsule",
      frequency: "TDS",
      duration: "7 days",
      route: "Oral",
      qty: 21,
    },
  ],
};

type MedicineHit = {
  id: string;
  name: string;
  genericName: string | null;
  category: string;
  unit: string;
  stockQty: string | number;
  salePrice: string | number;
};

export function PrescriptionBuilder({
  value,
  onChange,
  patientAllergies,
}: {
  value: MedicineItem[];
  onChange: (v: MedicineItem[]) => void;
  patientAllergies: string[];
}) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<MedicineHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [manualName, setManualName] = useState("");

  useEffect(() => {
    if (!query.trim()) {
      setHits([]);
      return;
    }
    const handle = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/inventory/medicines?q=${encodeURIComponent(query)}&limit=6`,
        );
        const body = await res.json();
        if (body?.success) setHits(body.data);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(handle);
  }, [query]);

  const update = useCallback(
    (i: number, patch: Partial<MedicineItem>) => {
      const next = [...value];
      next[i] = { ...next[i], ...patch };
      onChange(next);
    },
    [value, onChange],
  );

  const remove = useCallback(
    (i: number) => {
      onChange(value.filter((_, idx) => idx !== i));
    },
    [value, onChange],
  );

  function addFromHit(h: MedicineHit) {
    const next: MedicineItem = {
      medicineId: h.id,
      name: h.name,
      genericName: h.genericName ?? undefined,
      dose: "",
      frequency: "",
      duration: "",
      route: "Oral",
      qty: 10,
    };
    onChange([...value, next]);
    setQuery("");
  }

  function addManual() {
    const name = manualName.trim();
    if (!name) return;
    onChange([
      ...value,
      {
        name,
        dose: "",
        frequency: "",
        duration: "",
        route: "Oral",
        qty: 10,
      },
    ]);
    setManualName("");
  }

  function applyTemplate(key: keyof typeof TEMPLATES) {
    onChange([...value, ...TEMPLATES[key]]);
  }

  function isAllergyConflict(m: MedicineItem): boolean {
    const name = (m.name + " " + (m.genericName ?? "")).toLowerCase();
    return patientAllergies.some((a) => name.includes(a.toLowerCase()));
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">
          Quick templates:
        </span>
        {Object.keys(TEMPLATES).map((t) => (
          <Button
            key={t}
            type="button"
            size="xs"
            variant="outline"
            onClick={() => applyTemplate(t as keyof typeof TEMPLATES)}
          >
            + {t}
          </Button>
        ))}
      </div>

      <div className="rounded-lg border bg-muted/30 p-3">
        <Label className="text-xs text-muted-foreground">
          Add medicine from inventory
        </Label>
        <div className="relative mt-1.5">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or generic..."
            className="pl-9"
          />
          {loading && (
            <Loader2 className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
        </div>
        {query && (
          <div className="mt-2 overflow-hidden rounded-md border bg-background">
            {hits.length === 0 && !loading ? (
              <div className="p-3 text-xs text-muted-foreground">
                No match in inventory. Add manually below.
              </div>
            ) : (
              <ul className="max-h-48 overflow-y-auto">
                {hits.map((h) => (
                  <li key={h.id}>
                    <button
                      type="button"
                      onClick={() => addFromHit(h)}
                      className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-accent"
                    >
                      <div>
                        <div className="font-medium">{h.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {h.genericName ?? h.category} · {h.unit}
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        stock {String(h.stockQty)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        <div className="mt-2 flex items-center gap-2">
          <Input
            value={manualName}
            onChange={(e) => setManualName(e.target.value)}
            placeholder="Or type a medicine name manually"
            className="flex-1"
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={addManual}
            disabled={!manualName.trim()}
          >
            <Plus className="mr-1 h-3 w-3" />
            Add
          </Button>
        </div>
      </div>

      {value.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          No medicines yet. Add from the search above or pick a template.
        </div>
      ) : (
        <ul className="space-y-2">
          <AnimatePresence initial={false}>
            {value.map((m, i) => {
              const conflict = isAllergyConflict(m);
              return (
                <motion.li
                  key={i}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className={cn(
                    "rounded-lg border p-3 text-sm",
                    conflict && "border-destructive/40 bg-destructive/5",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <Input
                        value={m.name}
                        onChange={(e) => update(i, { name: e.target.value })}
                        className="h-8 font-medium"
                      />
                      {m.genericName && (
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {m.genericName}
                        </div>
                      )}
                      {conflict && (
                        <div className="mt-1 text-xs font-medium text-destructive">
                          ⚠ Possible allergy conflict
                        </div>
                      )}
                    </div>
                    <Button
                      type="button"
                      size="icon-xs"
                      variant="ghost"
                      onClick={() => remove(i)}
                      aria-label="Remove"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
                    <Input
                      placeholder="Dose"
                      value={m.dose ?? ""}
                      onChange={(e) => update(i, { dose: e.target.value })}
                      className="h-8"
                    />
                    <select
                      value={m.frequency ?? ""}
                      onChange={(e) => update(i, { frequency: e.target.value })}
                      className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                    >
                      <option value="">Frequency</option>
                      {FREQUENCIES.map((f) => (
                        <option key={f}>{f}</option>
                      ))}
                    </select>
                    <select
                      value={m.duration ?? ""}
                      onChange={(e) => update(i, { duration: e.target.value })}
                      className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                    >
                      <option value="">Duration</option>
                      {DURATIONS.map((d) => (
                        <option key={d}>{d}</option>
                      ))}
                    </select>
                    <select
                      value={m.route ?? "Oral"}
                      onChange={(e) => update(i, { route: e.target.value })}
                      className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                    >
                      {ROUTES.map((r) => (
                        <option key={r}>{r}</option>
                      ))}
                    </select>
                    <Input
                      placeholder="Qty"
                      type="number"
                      value={m.qty ?? ""}
                      onChange={(e) =>
                        update(i, { qty: Number(e.target.value) })
                      }
                      className="h-8"
                    />
                  </div>
                  <Input
                    className="mt-2 h-8"
                    placeholder="Instructions — after meal, with water..."
                    value={m.instructions ?? ""}
                    onChange={(e) => update(i, { instructions: e.target.value })}
                  />
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
}
