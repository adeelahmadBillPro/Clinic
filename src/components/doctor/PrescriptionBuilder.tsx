"use client";

import { useEffect, useState, useCallback } from "react";
import {
  X,
  Plus,
  Search,
  Loader2,
  Pill,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  GripVertical,
  FlaskConical,
  Stethoscope,
  Syringe,
  Wind,
  Droplets,
  SquareActivity,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import type { MedicineItem } from "@/lib/validations/consultation";
import { cn } from "@/lib/utils";
import { RxTemplatesMenu } from "./RxTemplatesMenu";

const FREQUENCIES: Array<{ v: string; label: string; help: string }> = [
  { v: "OD", label: "OD", help: "Once daily" },
  { v: "BD", label: "BD", help: "Twice daily" },
  { v: "TDS", label: "TDS", help: "Three times daily" },
  { v: "QID", label: "QID", help: "Four times daily" },
  { v: "PRN", label: "PRN", help: "As needed" },
  { v: "HS", label: "HS", help: "At bedtime" },
  { v: "Stat", label: "Stat", help: "Immediately, once" },
];

const DURATIONS = [
  "3 days",
  "5 days",
  "7 days",
  "10 days",
  "14 days",
  "1 month",
  "3 months",
];

const ROUTES: Array<{ v: string; icon: typeof Pill }> = [
  { v: "Oral", icon: Pill },
  { v: "IV", icon: Syringe },
  { v: "IM", icon: Syringe },
  { v: "SC", icon: Syringe },
  { v: "Topical", icon: Droplets },
  { v: "Inhalation", icon: Wind },
  { v: "PR", icon: SquareActivity },
  { v: "PV", icon: SquareActivity },
];

const TEMPLATES: Record<
  string,
  { label: string; icon: typeof Pill; items: MedicineItem[] }
> = {
  flu: {
    label: "Flu / URI",
    icon: Wind,
    items: [
      { name: "Paracetamol 500mg", dose: "1 tablet", frequency: "TDS", duration: "5 days", route: "Oral", qty: 15 },
      { name: "Cetirizine 10mg", dose: "1 tablet", frequency: "HS", duration: "5 days", route: "Oral", qty: 5 },
    ],
  },
  hypertension: {
    label: "Hypertension",
    icon: SquareActivity,
    items: [
      { name: "Amlodipine 5mg", dose: "1 tablet", frequency: "OD", duration: "1 month", route: "Oral", qty: 30 },
    ],
  },
  diabetes: {
    label: "Diabetes",
    icon: Stethoscope,
    items: [
      { name: "Metformin 500mg", dose: "1 tablet", frequency: "BD", duration: "1 month", route: "Oral", qty: 60 },
    ],
  },
  antibiotics: {
    label: "Antibiotics",
    icon: FlaskConical,
    items: [
      { name: "Amoxicillin 500mg", dose: "1 capsule", frequency: "TDS", duration: "7 days", route: "Oral", qty: 21 },
    ],
  },
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
  userId,
}: {
  value: MedicineItem[];
  onChange: (v: MedicineItem[]) => void;
  patientAllergies: string[];
  userId?: string;
}) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<MedicineHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [manualName, setManualName] = useState("");
  const [expanded, setExpanded] = useState<number | null>(0);

  useEffect(() => {
    if (!query.trim()) {
      setHits([]);
      return;
    }
    // Cancel in-flight medicine lookups — doctors type fast, and stale
    // responses would overwrite the fresh hit list.
    const ac = new AbortController();
    const handle = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/inventory/medicines?q=${encodeURIComponent(query)}&limit=6`,
          { signal: ac.signal },
        );
        const body = await res.json();
        if (body?.success) setHits(body.data);
      } catch (e) {
        if ((e as Error).name !== "AbortError") throw e;
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => {
      clearTimeout(handle);
      ac.abort();
    };
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
      setExpanded(null);
    },
    [value, onChange],
  );

  const move = useCallback(
    (i: number, dir: -1 | 1) => {
      const j = i + dir;
      if (j < 0 || j >= value.length) return;
      const next = [...value];
      [next[i], next[j]] = [next[j], next[i]];
      onChange(next);
      setExpanded(j);
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
    setExpanded(value.length);
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
    setExpanded(value.length);
  }

  function applyTemplate(key: keyof typeof TEMPLATES) {
    const before = value.length;
    onChange([...value, ...TEMPLATES[key].items]);
    setExpanded(before);
  }

  function isAllergyConflict(m: MedicineItem): boolean {
    if (patientAllergies.length === 0) return false;
    const name = (m.name + " " + (m.genericName ?? "")).toLowerCase();
    return patientAllergies.some((a) => name.includes(a.toLowerCase()));
  }

  const conflicts = value.filter(isAllergyConflict).length;

  return (
    <div className="space-y-5">
      {/* Smart search — the hero input */}
      <div className="relative">
        <div
          className={cn(
            "relative flex items-center gap-3 rounded-xl border bg-gradient-to-br from-primary/5 to-background p-3 transition-all",
            query && "ring-2 ring-primary/20",
          )}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Pill className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="relative">
              <Search className="pointer-events-none absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search medicine by name or generic..."
                className="border-0 bg-transparent pl-6 shadow-none focus-visible:ring-0"
              />
              {loading && (
                <Loader2 className="absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
              )}
            </div>
          </div>
        </div>

        <AnimatePresence>
          {query && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-xl border bg-popover shadow-xl"
            >
              {hits.length === 0 && !loading ? (
                <div className="p-4 text-sm text-muted-foreground">
                  No match in inventory. Use &ldquo;Add manually&rdquo; below.
                </div>
              ) : (
                <motion.ul
                  className="max-h-64 overflow-y-auto"
                  variants={{
                    animate: { transition: { staggerChildren: 0.02 } },
                  }}
                  initial="initial"
                  animate="animate"
                >
                  {hits.map((h) => {
                    const low = Number(h.stockQty) < 10;
                    const out = Number(h.stockQty) === 0;
                    return (
                      <motion.li
                        key={h.id}
                        variants={{
                          initial: { opacity: 0, x: -4 },
                          animate: { opacity: 1, x: 0 },
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => addFromHit(h)}
                          className="group flex w-full items-center gap-3 px-3.5 py-2.5 text-left text-sm hover:bg-accent"
                        >
                          <Pill className="h-4 w-4 shrink-0 text-primary/70 transition group-hover:text-primary" />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{h.name}</div>
                            <div className="text-xs text-muted-foreground truncate">
                              {h.genericName ?? h.category} · {h.unit} · ₨{" "}
                              {Math.round(Number(h.salePrice)).toLocaleString()}
                            </div>
                          </div>
                          <span
                            className={cn(
                              "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
                              out
                                ? "bg-destructive/10 text-destructive"
                                : low
                                  ? "bg-amber-500/15 text-amber-700"
                                  : "bg-emerald-500/10 text-emerald-700",
                            )}
                          >
                            {out ? "out" : `${h.stockQty} left`}
                          </span>
                        </button>
                      </motion.li>
                    );
                  })}
                </motion.ul>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Manual add + Templates row */}
      <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
        <div className="flex items-center gap-2">
          <Input
            value={manualName}
            onChange={(e) => setManualName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addManual();
              }
            }}
            placeholder="Not in inventory? Type any medicine name and press Enter"
            className="h-10"
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={addManual}
            disabled={!manualName.trim()}
            className="shrink-0"
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            Add
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 lg:justify-end">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Presets
          </span>
          {Object.entries(TEMPLATES).map(([key, tpl]) => {
            const Icon = tpl.icon;
            return (
              <Button
                key={key}
                type="button"
                size="xs"
                variant="outline"
                onClick={() => applyTemplate(key as keyof typeof TEMPLATES)}
                className="gap-1"
              >
                <Icon className="h-3 w-3" />
                {tpl.label}
              </Button>
            );
          })}
          {userId && (
            <>
              <span className="mx-1 h-4 w-px bg-border" aria-hidden />
              <RxTemplatesMenu
                userId={userId}
                currentItems={value}
                onApply={(items) => {
                  onChange([...value, ...items]);
                  setExpanded(value.length);
                }}
              />
            </>
          )}
        </div>
      </div>

      {/* Allergy warning banner */}
      <AnimatePresence>
        {conflicts > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <motion.div
              animate={{
                x: [0, -2, 2, -2, 2, -1, 1, 0],
                transition: { duration: 0.55, repeat: Infinity, repeatDelay: 4 },
              }}
              className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-3.5"
            >
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
              <div className="text-sm">
                <div className="font-semibold text-destructive">
                  {conflicts} possible allergy{" "}
                  {conflicts === 1 ? "conflict" : "conflicts"}
                </div>
                <div className="mt-0.5 text-xs text-destructive/85">
                  Patient is allergic to:{" "}
                  <span className="font-medium">
                    {patientAllergies.join(", ")}
                  </span>
                  . Review flagged medicines below.
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rx items — the beautiful list */}
      {value.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border-2 border-dashed bg-muted/20 p-10 text-center"
        >
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Pill className="h-5 w-5" />
          </div>
          <div className="text-sm font-medium">Start writing the Rx</div>
          <div className="mt-1 text-xs text-muted-foreground">
            Search above, pick a template, or type a medicine name manually.
          </div>
        </motion.div>
      ) : (
        <div>
          <div className="mb-2 flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-lg font-bold text-primary">
                ℞
              </span>
              <span className="text-sm font-semibold">
                {value.length}{" "}
                {value.length === 1 ? "medicine" : "medicines"}
              </span>
            </div>
            {conflicts > 0 && (
              <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-medium text-destructive">
                {conflicts} to review
              </span>
            )}
          </div>
          <ol className="space-y-2">
            <AnimatePresence initial={false}>
              {value.map((m, i) => {
                const conflict = isAllergyConflict(m);
                const isOpen = expanded === i;
                return (
                  <motion.li
                    key={i}
                    layout
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.98 }}
                    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                    className={cn(
                      "group relative overflow-hidden rounded-xl border bg-card transition-shadow",
                      conflict &&
                        "border-destructive/40 bg-destructive/5",
                      isOpen && "shadow-md",
                    )}
                  >
                    {/* Header row */}
                    <div className="flex items-center gap-3 p-3.5">
                      <div className="flex flex-col items-center gap-0.5 opacity-60 transition group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={() => move(i, -1)}
                          disabled={i === 0}
                          className="rounded p-0.5 hover:bg-accent disabled:opacity-30 disabled:pointer-events-none"
                          aria-label="Move up"
                        >
                          <ArrowUp className="h-3 w-3" />
                        </button>
                        <GripVertical className="h-3 w-3 text-muted-foreground" />
                        <button
                          type="button"
                          onClick={() => move(i, 1)}
                          disabled={i === value.length - 1}
                          className="rounded p-0.5 hover:bg-accent disabled:opacity-30 disabled:pointer-events-none"
                          aria-label="Move down"
                        >
                          <ArrowDown className="h-3 w-3" />
                        </button>
                      </div>

                      <div
                        className={cn(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg font-mono text-sm font-bold",
                          conflict
                            ? "bg-destructive/15 text-destructive"
                            : "bg-primary/10 text-primary",
                        )}
                      >
                        {i + 1}
                      </div>

                      <button
                        type="button"
                        onClick={() => setExpanded(isOpen ? null : i)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-semibold">
                            {m.name}
                          </span>
                          {conflict && (
                            <span className="shrink-0 rounded-full bg-destructive/15 px-1.5 py-0.5 text-[9px] font-medium text-destructive">
                              ⚠ allergy
                            </span>
                          )}
                        </div>
                        {m.genericName && (
                          <div className="truncate text-[11px] text-muted-foreground">
                            {m.genericName}
                          </div>
                        )}
                        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
                          {m.dose && (
                            <span className="rounded-md bg-muted px-1.5 py-0.5">
                              {m.dose}
                            </span>
                          )}
                          {m.frequency && (
                            <span className="rounded-md bg-primary/10 px-1.5 py-0.5 font-medium text-primary">
                              {m.frequency}
                            </span>
                          )}
                          {m.duration && (
                            <span className="rounded-md bg-muted px-1.5 py-0.5">
                              × {m.duration}
                            </span>
                          )}
                          {m.route && m.route !== "Oral" && (
                            <span className="rounded-md bg-muted px-1.5 py-0.5 text-muted-foreground">
                              {m.route}
                            </span>
                          )}
                          {m.qty ? (
                            <span className="ml-auto text-muted-foreground">
                              Qty {m.qty}
                            </span>
                          ) : null}
                        </div>
                      </button>

                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => remove(i)}
                        aria-label="Remove"
                        className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    {/* Expanded editor */}
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.22 }}
                          className="overflow-hidden border-t bg-muted/20"
                        >
                          <div className="space-y-3 p-3.5">
                            <Input
                              value={m.name}
                              onChange={(e) =>
                                update(i, { name: e.target.value })
                              }
                              className="font-medium"
                              placeholder="Medicine name"
                            />

                            {/* Dose + Qty */}
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                  Dose
                                </div>
                                <Input
                                  placeholder="e.g. 1 tablet"
                                  value={m.dose ?? ""}
                                  onChange={(e) =>
                                    update(i, { dose: e.target.value })
                                  }
                                  className="h-9"
                                />
                              </div>
                              <div>
                                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                  Quantity
                                </div>
                                <Input
                                  placeholder="e.g. 15"
                                  type="number"
                                  min={0}
                                  value={m.qty ?? ""}
                                  onChange={(e) =>
                                    update(i, { qty: Number(e.target.value) })
                                  }
                                  className="h-9"
                                />
                              </div>
                            </div>

                            {/* Frequency pills */}
                            <div>
                              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                Frequency
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {FREQUENCIES.map((f) => (
                                  <button
                                    key={f.v}
                                    type="button"
                                    onClick={() =>
                                      update(i, { frequency: f.v })
                                    }
                                    title={f.help}
                                    className={cn(
                                      "inline-flex flex-col items-center gap-0 rounded-md border px-2.5 py-1 text-xs font-semibold transition",
                                      m.frequency === f.v
                                        ? "border-primary bg-primary text-primary-foreground shadow-sm"
                                        : "border-border bg-background hover:border-primary/40 hover:bg-accent",
                                    )}
                                  >
                                    <span>{f.label}</span>
                                    <span className="text-[8px] font-normal opacity-70">
                                      {f.help}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Duration pills */}
                            <div>
                              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                Duration
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {DURATIONS.map((d) => (
                                  <button
                                    key={d}
                                    type="button"
                                    onClick={() =>
                                      update(i, { duration: d })
                                    }
                                    className={cn(
                                      "rounded-md border px-2.5 py-1 text-xs font-medium transition",
                                      m.duration === d
                                        ? "border-primary bg-primary text-primary-foreground shadow-sm"
                                        : "border-border bg-background hover:border-primary/40 hover:bg-accent",
                                    )}
                                  >
                                    {d}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Route icons */}
                            <div>
                              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                Route
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {ROUTES.map((r) => {
                                  const Icon = r.icon;
                                  return (
                                    <button
                                      key={r.v}
                                      type="button"
                                      onClick={() =>
                                        update(i, { route: r.v })
                                      }
                                      className={cn(
                                        "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition",
                                        m.route === r.v
                                          ? "border-primary bg-primary text-primary-foreground shadow-sm"
                                          : "border-border bg-background hover:border-primary/40 hover:bg-accent",
                                      )}
                                    >
                                      <Icon className="h-3 w-3" />
                                      {r.v}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Instructions */}
                            <div>
                              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                Instructions for patient
                              </div>
                              <Input
                                placeholder="After meal · with water · avoid dairy · etc."
                                value={m.instructions ?? ""}
                                onChange={(e) =>
                                  update(i, { instructions: e.target.value })
                                }
                              />
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ol>
        </div>
      )}
    </div>
  );
}
