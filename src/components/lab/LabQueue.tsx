"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, RefreshCcw, Plus } from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePolling } from "@/lib/hooks/usePolling";
import { NewLabOrderDialog } from "./NewLabOrderDialog";
import { LabResultDialog } from "./LabResultDialog";

type Order = {
  id: string;
  orderNumber: string;
  status: "ORDERED" | "SAMPLE_COLLECTED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  tests: Array<{ code: string; name: string; price: number }>;
  totalAmount: number;
  createdAt: string;
  patient: { id: string; name: string; mrn: string; phone: string } | null;
};

const STATUS_BG: Record<Order["status"], string> = {
  ORDERED: "bg-amber-500/10 text-amber-700 border-amber-500/25",
  SAMPLE_COLLECTED: "bg-sky-500/10 text-sky-700 border-sky-500/25",
  IN_PROGRESS: "bg-violet-500/10 text-violet-700 border-violet-500/25",
  COMPLETED: "bg-emerald-500/10 text-emerald-700 border-emerald-500/25",
  CANCELLED: "bg-muted text-muted-foreground",
};

export function LabQueue() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Order["status"] | "ALL">("ORDERED");
  const [active, setActive] = useState<Order | null>(null);
  const [newOpen, setNewOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/lab/orders?status=${tab}`);
      const body = await res.json();
      if (body?.success) setOrders(body.data);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  usePolling(load, 12000);

  return (
    <>
      <div className="rounded-xl border bg-card p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-sm font-semibold">Lab orders</div>
            <div className="text-xs text-muted-foreground">
              Auto-refreshing every 12 seconds.
            </div>
          </div>
          <div className="flex items-center gap-2">
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
            <Button size="sm" onClick={() => setNewOpen(true)}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              New order
            </Button>
          </div>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="ORDERED">Ordered</TabsTrigger>
            <TabsTrigger value="SAMPLE_COLLECTED">Sample</TabsTrigger>
            <TabsTrigger value="IN_PROGRESS">In progress</TabsTrigger>
            <TabsTrigger value="COMPLETED">Completed</TabsTrigger>
            <TabsTrigger value="ALL">All</TabsTrigger>
          </TabsList>
          <TabsContent value={tab} className="mt-3">
            {orders.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                No orders in this view.
              </div>
            ) : (
              <motion.ul
                className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3"
                initial="initial"
                animate="animate"
                variants={{ animate: { transition: { staggerChildren: 0.03 } } }}
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
                        className={`block w-full rounded-lg border px-3.5 py-3 text-left transition hover:shadow-sm ${STATUS_BG[o.status]}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="font-mono text-xs font-semibold">
                              {o.orderNumber}
                            </div>
                            <div className="mt-1 truncate text-sm font-medium">
                              {o.patient?.name ?? "—"}
                            </div>
                            <div className="mt-0.5 truncate text-xs text-muted-foreground">
                              {o.tests.map((t) => t.code).join(", ")}
                            </div>
                          </div>
                          <Badge variant="secondary" className="shrink-0 text-[10px]">
                            {o.status.replace("_", " ")}
                          </Badge>
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

      {newOpen && (
        <NewLabOrderDialog
          onClose={() => setNewOpen(false)}
          onDone={() => {
            setNewOpen(false);
            load();
          }}
        />
      )}
      {active && (
        <LabResultDialog
          order={active}
          onClose={() => setActive(null)}
          onSaved={() => {
            setActive(null);
            load();
          }}
        />
      )}
    </>
  );
}
