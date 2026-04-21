"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, RefreshCcw } from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  const [orders, setOrders] = useState<PharmacyOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"PENDING" | "PARTIAL" | "DISPENSED" | "ALL">(
    "PENDING",
  );
  const [active, setActive] = useState<PharmacyOrder | null>(null);

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

        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="PENDING">Pending</TabsTrigger>
            <TabsTrigger value="PARTIAL">Partial</TabsTrigger>
            <TabsTrigger value="DISPENSED">Done</TabsTrigger>
            <TabsTrigger value="ALL">All</TabsTrigger>
          </TabsList>
          <TabsContent value={tab} className="mt-3">
            {orders.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                No prescriptions in this view.
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
                  {orders.map((o) => (
                    <motion.li
                      key={o.id}
                      variants={{
                        initial: { opacity: 0, y: 6 },
                        animate: { opacity: 1, y: 0 },
                        exit: { opacity: 0, y: -6 },
                      }}
                      className="min-w-0"
                    >
                      <button
                        onClick={() => setActive(o)}
                        className={`relative flex w-full items-start gap-3 rounded-lg border px-3.5 py-3 text-left transition hover:shadow-sm ${STATUS_TONE[o.status]}`}
                      >
                        <div className="min-w-0 flex-1">
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
                        </div>
                      </button>
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
          onDone={() => {
            setActive(null);
            load();
          }}
        />
      )}
    </>
  );
}
