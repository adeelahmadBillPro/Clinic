"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type BillRow = {
  id: string;
  billNumber: string;
  billType: string;
  status: string;
  totalAmount: number;
  paidAmount: number;
  balance: number;
  paymentMethod: string | null;
  createdAt: string;
  patient: { id: string; name: string; mrn: string } | null;
};

const STATUS_COLORS: Record<string, string> = {
  PAID: "bg-emerald-500/10 text-emerald-700 border-emerald-500/25",
  PARTIAL: "bg-amber-500/10 text-amber-700 border-amber-500/25",
  PENDING: "bg-slate-500/10 text-slate-700 border-slate-500/25",
  CANCELLED: "bg-muted text-muted-foreground",
  REFUNDED: "bg-violet-500/10 text-violet-700 border-violet-500/25",
};

export function BillingList({ initial }: { initial: BillRow[] }) {
  const [tab, setTab] = useState<"ALL" | "PENDING" | "PARTIAL" | "PAID">("ALL");
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<BillRow[]>(initial);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handle = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (tab !== "ALL") params.set("status", tab);
        if (q.trim()) params.set("q", q.trim());
        const res = await fetch(`/api/billing?${params.toString()}`);
        const body = await res.json();
        if (body?.success) setRows(body.data);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(handle);
  }, [tab, q]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search bill number..."
            className="pl-9"
          />
        </div>
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList>
            <TabsTrigger value="ALL">All</TabsTrigger>
            <TabsTrigger value="PENDING">Pending</TabsTrigger>
            <TabsTrigger value="PARTIAL">Partial</TabsTrigger>
            <TabsTrigger value="PAID">Paid</TabsTrigger>
          </TabsList>
          <TabsContent value={tab}></TabsContent>
        </Tabs>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          No bills match.
        </div>
      ) : (
        <motion.ul
          initial="initial"
          animate="animate"
          variants={{
            animate: { transition: { staggerChildren: 0.02 } },
          }}
          className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3"
        >
          {rows.map((b) => (
            <motion.li
              key={b.id}
              variants={{
                initial: { opacity: 0, y: 6 },
                animate: { opacity: 1, y: 0 },
              }}
            >
              <Link
                href={`/billing/${b.id}`}
                className="block rounded-xl border bg-card p-4 transition hover:border-primary/40 hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-mono text-xs font-semibold">
                      {b.billNumber}
                    </div>
                    <div className="mt-1 truncate text-sm font-medium">
                      {b.patient?.name ?? "Unknown"}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {b.patient?.mrn}
                    </div>
                  </div>
                  <Badge
                    className={cn(
                      "border text-[10px] font-medium",
                      STATUS_COLORS[b.status],
                    )}
                    variant="outline"
                  >
                    {b.status}
                  </Badge>
                </div>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {b.billType} · {b.paymentMethod ?? "—"}
                  </span>
                  <span className="tabular-nums font-semibold">
                    ₨ {Math.round(b.totalAmount).toLocaleString()}
                  </span>
                </div>
                {b.balance > 0 && (
                  <div className="mt-1 text-xs text-amber-600">
                    Balance ₨ {Math.round(b.balance).toLocaleString()}
                  </div>
                )}
                <div className="mt-0.5 text-[10px] text-muted-foreground">
                  {new Date(b.createdAt).toLocaleString()}
                </div>
              </Link>
            </motion.li>
          ))}
        </motion.ul>
      )}
    </div>
  );
}
