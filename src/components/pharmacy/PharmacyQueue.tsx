"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, RefreshCcw, Search, X } from "lucide-react";
import { toast } from "sonner";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DispenseDialog } from "./DispenseDialog";

export type PharmacyOrder = {
  id: string;
  orderNumber: string;
  status: "PENDING" | "DISPENSED" | "PARTIAL" | "CANCELLED";
  totalAmount: number;
  paidAmount: number;
  items: Array<{
    medicineId?: string | null;
    name: string;
    qty: number;
    dispensedQty?: number;
    unitPrice?: number;
    dose?: string;
    frequency?: string;
    duration?: string;
    instructions?: string;
  }>;
  createdAt: string;
  patient: {
    id: string;
    name: string;
    phone: string;
    mrn: string;
    allergies?: string[];
  } | null;
};

const STATUS_TONE: Record<PharmacyOrder["status"], string> = {
  PENDING: "border-amber-500/30 bg-amber-500/5",
  DISPENSED: "border-emerald-500/30 bg-emerald-500/5",
  PARTIAL: "border-sky-500/30 bg-sky-500/5",
  CANCELLED: "border-slate-300 bg-muted",
};

function waited(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ${m % 60}m ago`;
}

export function PharmacyQueue() {
  const router = useRouter();
  const [orders, setOrders] = useState<PharmacyOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"PENDING" | "PARTIAL" | "DISPENSED" | "ALL">(
    "PENDING",
  );
  const [active, setActive] = useState<PharmacyOrder | null>(null);
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/pharmacy/orders?status=${tab}`);
      const body = await res.json();
      if (body?.success) setOrders(body.data);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    setLoading(true);
    load();
    const i = setInterval(load, 10000);
    return () => clearInterval(i);
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter(
      (o) =>
        o.orderNumber.toLowerCase().includes(q) ||
        o.patient?.name.toLowerCase().includes(q) ||
        o.patient?.mrn.toLowerCase().includes(q) ||
        o.patient?.phone.includes(q),
    );
  }, [query, orders]);

  async function cancelOrder(id: string) {
    if (!confirm("Cancel this prescription? It can be re-issued later.")) return;
    const res = await fetch(`/api/pharmacy/orders/${id}`, {
      method: "DELETE",
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body?.success) {
      toast.error(body?.error ?? "Could not cancel");
      return;
    }
    toast.success("Prescription cancelled");
    load();
  }

  return (
    <>
      <div className="overflow-hidden rounded-xl border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-semibold">Prescriptions</div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={load}
            aria-label="Refresh"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCcw className="h-4 w-4" />
            )}
          </Button>
        </div>

        <div className="relative mb-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by patient name, MRN, phone, or order #"
            className="h-9 pl-9"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-muted"
              aria-label="Clear search"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="PENDING">Pending</TabsTrigger>
            <TabsTrigger value="PARTIAL">Partial</TabsTrigger>
            <TabsTrigger value="DISPENSED">Done</TabsTrigger>
            <TabsTrigger value="ALL">All</TabsTrigger>
          </TabsList>
          <TabsContent value={tab} className="mt-3">
            {filtered.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                {query
                  ? `No match for "${query}".`
                  : "No prescriptions in this view."}
              </div>
            ) : (
              <motion.ul
                initial="initial"
                animate="animate"
                variants={{
                  animate: { transition: { staggerChildren: 0.03 } },
                }}
                className="grid gap-2 sm:grid-cols-2"
              >
                <AnimatePresence initial={false}>
                  {filtered.map((o) => (
                    <motion.li
                      key={o.id}
                      variants={{
                        initial: { opacity: 0, y: 6 },
                        animate: { opacity: 1, y: 0 },
                        exit: { opacity: 0, y: -6 },
                      }}
                      className="min-w-0"
                    >
                      <div
                        className={`relative flex w-full items-start gap-3 rounded-lg border px-3.5 py-3 text-left transition hover:shadow-sm ${STATUS_TONE[o.status]}`}
                      >
                        <button
                          onClick={() => setActive(o)}
                          className="min-w-0 flex-1 text-left"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="font-mono text-xs font-semibold">
                              {o.orderNumber}
                            </div>
                            <Badge
                              variant="secondary"
                              className="text-[10px]"
                            >
                              {o.status}
                            </Badge>
                          </div>
                          <div className="mt-1 truncate text-sm font-medium">
                            {o.patient?.name ?? "Unknown"}
                          </div>
                          <div className="truncate text-xs text-muted-foreground">
                            {o.patient?.mrn} · {o.items.length} medicines
                          </div>
                          <div className="mt-1 text-[10px] text-muted-foreground">
                            {waited(o.createdAt)}
                          </div>
                        </button>
                        {o.status === "PENDING" && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              cancelOrder(o.id);
                            }}
                            className="shrink-0 rounded-full p-1 text-muted-foreground opacity-0 transition hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                            aria-label="Cancel prescription"
                            title="Cancel (patient didn't come)"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </motion.ul>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {active && (
        <DispenseDialog
          order={active}
          onClose={() => setActive(null)}
          onDone={(billId?: string) => {
            setActive(null);
            load();
            if (billId) router.push(`/billing/${billId}`);
          }}
        />
      )}
    </>
  );
}
