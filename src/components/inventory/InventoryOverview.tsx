"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Search, AlertTriangle, Package } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { useRouter } from "next/navigation";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { AddMedicineDialog } from "./AddMedicineDialog";
import { EditStockDialog } from "./EditStockDialog";
import { cn } from "@/lib/utils";

type Medicine = {
  id: string;
  name: string;
  genericName: string | null;
  category: string;
  unit: string;
  stockQty: number;
  minStockLevel: number;
  purchasePrice: number;
  salePrice: number;
  batchNumber: string | null;
  expiryDate: string | null;
  location: string | null;
};

type ExpSoonItem = {
  id: string;
  name: string;
  batchNumber: string | null;
  expiryDate: string | null;
  stockQty: number;
};

function daysUntil(iso: string | null) {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  return Math.ceil(diff / (24 * 60 * 60 * 1000));
}

export function InventoryOverview({
  medicines,
  lowStockCount,
  expSoonCount,
  stockValue,
  expSoon,
}: {
  medicines: Medicine[];
  lowStockCount: number;
  expSoonCount: number;
  stockValue: number;
  expSoon: ExpSoonItem[];
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"ALL" | "LOW" | "EXPIRING">("ALL");
  const [editing, setEditing] = useState<Medicine | null>(null);

  const filtered = useMemo(() => {
    let rows = medicines;
    if (q.trim()) {
      const lower = q.toLowerCase();
      rows = rows.filter(
        (m) =>
          m.name.toLowerCase().includes(lower) ||
          m.genericName?.toLowerCase().includes(lower),
      );
    }
    if (tab === "LOW") {
      rows = rows.filter((m) => m.stockQty <= m.minStockLevel);
    } else if (tab === "EXPIRING") {
      const expIds = new Set(expSoon.map((e) => e.id));
      rows = rows.filter((m) => expIds.has(m.id));
    }
    return rows;
  }, [q, tab, medicines, expSoon]);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total medicines" value={medicines.length} icon="Package" />
        <KpiCard
          label="Low stock"
          value={lowStockCount}
          icon="AlertTriangle"
          tone={lowStockCount > 0 ? "danger" : "default"}
          shakeWhenPositive
        />
        <KpiCard
          label="Expiring ≤ 30d"
          value={expSoonCount}
          icon="Calendar"
          tone={expSoonCount > 0 ? "warning" : "default"}
        />
        <KpiCard
          label="Stock value"
          value={stockValue}
          format="currency"
          icon="LineChart"
          currencySymbol="₨"
        />
      </div>

      {expSoon.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4"
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-amber-700">
            <AlertTriangle className="h-4 w-4" />
            Expiring soon
          </div>
          <div className="mt-2 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
            {expSoon.map((e) => {
              const d = daysUntil(e.expiryDate);
              return (
                <div
                  key={e.id}
                  className="flex items-center justify-between gap-2 rounded-md border bg-background px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium">{e.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {e.batchNumber ? `Batch ${e.batchNumber} · ` : ""}
                      Qty {e.stockQty}
                    </div>
                  </div>
                  <Badge
                    variant="secondary"
                    className={cn(
                      "text-[10px]",
                      (d ?? 0) <= 7 && "bg-destructive/10 text-destructive",
                    )}
                  >
                    {d}d left
                  </Badge>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search medicines..."
            className="pl-9"
          />
        </div>
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList>
            <TabsTrigger value="ALL">All</TabsTrigger>
            <TabsTrigger value="LOW">Low stock</TabsTrigger>
            <TabsTrigger value="EXPIRING">Expiring</TabsTrigger>
          </TabsList>
          <TabsContent value={tab}></TabsContent>
        </Tabs>
        <AddMedicineDialog onCreated={() => router.refresh()} />
      </div>

      {filtered.length === 0 ? (
        medicines.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No medicines yet"
            description="Add your first medicine using the Add medicine button above. You can also import from a purchase order."
          />
        ) : (
          <EmptyState
            icon={Search}
            title="No medicines match"
            description="Try a different name or clear the filter to see your full list."
          />
        )
      ) : (
        <motion.ul
          initial="initial"
          animate="animate"
          variants={{
            animate: { transition: { staggerChildren: 0.02 } },
          }}
          className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {filtered.map((m) => {
            const low = m.stockQty <= m.minStockLevel;
            const critical = m.stockQty <= m.minStockLevel / 2;
            const expiryDays = daysUntil(m.expiryDate);
            return (
              <motion.li
                key={m.id}
                variants={{
                  initial: { opacity: 0, y: 6 },
                  animate: { opacity: 1, y: 0 },
                }}
              >
                <button
                  onClick={() => setEditing(m)}
                  className="block w-full rounded-xl border bg-card p-4 text-left transition hover:border-primary/40 hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{m.name}</div>
                      {m.genericName && (
                        <div className="text-xs text-muted-foreground">
                          {m.genericName}
                        </div>
                      )}
                    </div>
                    {critical ? (
                      <Badge
                        variant="secondary"
                        className="bg-destructive/10 text-destructive text-[10px]"
                      >
                        critical
                      </Badge>
                    ) : low ? (
                      <Badge
                        variant="secondary"
                        className="bg-amber-500/10 text-amber-700 text-[10px]"
                      >
                        low
                      </Badge>
                    ) : null}
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <div className="text-muted-foreground">Stock</div>
                      <div
                        className={cn(
                          "font-semibold tabular-nums",
                          critical && "text-destructive",
                          low && !critical && "text-amber-700",
                        )}
                      >
                        {m.stockQty} {m.unit}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Sale price</div>
                      <div className="font-semibold tabular-nums">
                        ₨ {Math.round(m.salePrice).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  {m.expiryDate && (
                    <div className="mt-2 text-[10px] text-muted-foreground">
                      {expiryDays !== null && expiryDays <= 0
                        ? "EXPIRED"
                        : `Expires in ${expiryDays}d`}
                    </div>
                  )}
                </button>
              </motion.li>
            );
          })}
        </motion.ul>
      )}

      {editing && (
        <EditStockDialog
          medicine={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
