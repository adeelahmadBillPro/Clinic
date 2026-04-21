"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  PhoneCall,
  XCircle,
  CheckCircle2,
  Loader2,
  Zap,
  RefreshCcw,
} from "lucide-react";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type TokenItem = {
  id: string;
  displayToken: string;
  tokenNumber: number;
  status: "WAITING" | "CALLED" | "IN_PROGRESS" | "COMPLETED" | "EXPIRED" | "CANCELLED";
  type: "OPD" | "IPD" | "EMERGENCY";
  chiefComplaint: string | null;
  issuedAt: string;
  patient: {
    id: string;
    name: string;
    phone: string;
    mrn: string;
    allergies: string[];
    gender: string;
  } | null;
  doctor: {
    id: string;
    name: string;
    specialization: string;
    roomNumber: string | null;
  } | null;
};

const STATUS_STYLES: Record<
  TokenItem["status"],
  { border: string; bg: string; dot: string; label: string }
> = {
  WAITING: {
    border: "border-amber-500/30",
    bg: "bg-amber-500/5",
    dot: "bg-amber-500",
    label: "Waiting",
  },
  CALLED: {
    border: "border-sky-500/30",
    bg: "bg-sky-500/5",
    dot: "bg-sky-500",
    label: "Called",
  },
  IN_PROGRESS: {
    border: "border-emerald-500/30",
    bg: "bg-emerald-500/5",
    dot: "bg-emerald-500",
    label: "In progress",
  },
  COMPLETED: {
    border: "border-slate-300",
    bg: "bg-muted",
    dot: "bg-slate-400",
    label: "Completed",
  },
  EXPIRED: {
    border: "border-destructive/30",
    bg: "bg-destructive/5",
    dot: "bg-destructive",
    label: "Expired",
  },
  CANCELLED: {
    border: "border-slate-300",
    bg: "bg-muted",
    dot: "bg-slate-400",
    label: "Cancelled",
  },
};

function waitedMin(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const h = Math.floor(mins / 60);
  return `${h}h ${mins % 60}m ago`;
}

export function TokenBoard() {
  const [tokens, setTokens] = useState<TokenItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"ALL" | TokenItem["status"]>("ALL");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/tokens?today=true");
      const body = await res.json();
      if (body?.success) setTokens(body.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const i = setInterval(load, 7000);
    return () => clearInterval(i);
  }, [load]);

  const filtered =
    tab === "ALL"
      ? tokens.filter((t) => t.status !== "COMPLETED" && t.status !== "EXPIRED")
      : tokens.filter((t) => t.status === tab);

  const sorted = [...filtered].sort((a, b) => {
    // Emergency first inside WAITING
    if (a.status === "WAITING" && b.status === "WAITING") {
      if (a.type === "EMERGENCY" && b.type !== "EMERGENCY") return -1;
      if (b.type === "EMERGENCY" && a.type !== "EMERGENCY") return 1;
    }
    return new Date(a.issuedAt).getTime() - new Date(b.issuedAt).getTime();
  });

  async function patch(id: string, payload: Record<string, unknown>) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/tokens/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body?.success) {
        toast.error(body?.error ?? "Update failed");
        return;
      }
      await load();
    } catch {
      toast.error("Network error");
    } finally {
      setBusyId(null);
    }
  }

  const counts = {
    ALL: tokens.filter(
      (t) => t.status !== "COMPLETED" && t.status !== "EXPIRED",
    ).length,
    WAITING: tokens.filter((t) => t.status === "WAITING").length,
    IN_PROGRESS: tokens.filter((t) => t.status === "IN_PROGRESS").length,
    COMPLETED: tokens.filter((t) => t.status === "COMPLETED").length,
    EXPIRED: tokens.filter((t) => t.status === "EXPIRED").length,
  };

  return (
    <div className="overflow-hidden rounded-xl border bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">Today&rsquo;s tokens</div>
          <div className="text-xs text-muted-foreground">
            Auto-refreshing every 7 seconds.
          </div>
        </div>
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
        <TabsList className="w-full">
          <TabsTrigger value="ALL" className="flex-1">
            Active <Badge variant="secondary" className="ml-1.5">{counts.ALL}</Badge>
          </TabsTrigger>
          <TabsTrigger value="WAITING" className="flex-1">
            Waiting{" "}
            <Badge variant="secondary" className="ml-1.5">{counts.WAITING}</Badge>
          </TabsTrigger>
          <TabsTrigger value="IN_PROGRESS" className="flex-1 hidden sm:inline-flex">
            In session{" "}
            <Badge variant="secondary" className="ml-1.5">{counts.IN_PROGRESS}</Badge>
          </TabsTrigger>
          <TabsTrigger value="COMPLETED" className="flex-1 hidden md:inline-flex">
            Done{" "}
            <Badge variant="secondary" className="ml-1.5">{counts.COMPLETED}</Badge>
          </TabsTrigger>
          <TabsTrigger value="EXPIRED" className="flex-1 hidden md:inline-flex">
            Expired{" "}
            <Badge variant="secondary" className="ml-1.5">{counts.EXPIRED}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-3">
          {sorted.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              No tokens in this view.
            </div>
          ) : (
            <motion.ul
              className="space-y-2"
              variants={{
                animate: { transition: { staggerChildren: 0.03 } },
              }}
              initial="initial"
              animate="animate"
            >
              <AnimatePresence initial={false}>
                {sorted.map((tk) => {
                  const s = STATUS_STYLES[tk.status];
                  const isEmergency = tk.type === "EMERGENCY";
                  return (
                    <motion.li
                      key={tk.id}
                      variants={{
                        initial: { opacity: 0, y: 6 },
                        animate: { opacity: 1, y: 0 },
                        exit: { opacity: 0, y: -6 },
                      }}
                      className={cn(
                        "relative flex min-w-0 items-center gap-3 rounded-lg border px-3 py-3",
                        s.border,
                        s.bg,
                      )}
                    >
                      {isEmergency && (
                        <div className="absolute -top-1.5 -left-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground">
                          <Zap className="h-3 w-3" />
                        </div>
                      )}
                      <div className="flex flex-col items-center leading-tight">
                        <div className="font-mono text-lg font-bold text-primary">
                          {tk.displayToken}
                        </div>
                        <div
                          className={cn(
                            "mt-0.5 flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider",
                          )}
                        >
                          <span
                            className={cn("h-1.5 w-1.5 rounded-full", s.dot)}
                          />
                          {s.label}
                        </div>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 truncate text-sm font-medium">
                          {tk.patient?.name ?? "Unknown patient"}
                          {tk.patient?.allergies && tk.patient.allergies.length > 0 && (
                            <span className="inline-block rounded-full bg-destructive/10 px-1.5 py-0.5 text-[9px] font-medium text-destructive">
                              allergy
                            </span>
                          )}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">
                          {tk.doctor?.name}
                          {tk.doctor?.roomNumber && <> · R-{tk.doctor.roomNumber}</>}
                          {tk.chiefComplaint && <> · {tk.chiefComplaint}</>}
                        </div>
                        <div className="mt-0.5 text-[10px] text-muted-foreground">
                          Issued {waitedMin(tk.issuedAt)}
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-1">
                        {tk.status === "WAITING" && (
                          <Button
                            size="xs"
                            variant="outline"
                            disabled={busyId === tk.id}
                            onClick={() => patch(tk.id, { status: "CALLED" })}
                          >
                            <PhoneCall className="mr-1 h-3 w-3" />
                            Call
                          </Button>
                        )}
                        {tk.status === "CALLED" && (
                          <Button
                            size="xs"
                            variant="outline"
                            disabled={busyId === tk.id}
                            onClick={() =>
                              patch(tk.id, { status: "IN_PROGRESS" })
                            }
                          >
                            Start
                          </Button>
                        )}
                        {tk.status === "IN_PROGRESS" && (
                          <Button
                            size="xs"
                            variant="outline"
                            disabled={busyId === tk.id}
                            onClick={() => patch(tk.id, { status: "COMPLETED" })}
                          >
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            Done
                          </Button>
                        )}
                        {(tk.status === "WAITING" ||
                          tk.status === "CALLED") && (
                          <Button
                            size="icon-xs"
                            variant="ghost"
                            aria-label="Cancel"
                            disabled={busyId === tk.id}
                            onClick={() =>
                              patch(tk.id, {
                                status: "CANCELLED",
                                cancelReason: "Cancelled from reception",
                              })
                            }
                          >
                            <XCircle className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </motion.ul>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
