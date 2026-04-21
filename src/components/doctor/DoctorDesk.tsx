"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Zap } from "lucide-react";
import { toast } from "sonner";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ConsultationPanel } from "./ConsultationPanel";
import { DoctorStatusSwitcher } from "./DoctorStatusSwitcher";

type Doctor = {
  id: string;
  name: string;
  specialization: string;
  roomNumber: string | null;
  status: string;
  isAvailable: boolean;
  waitingCount: number;
};

type Token = {
  id: string;
  displayToken: string;
  status: string;
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
  } | null;
};

function waitedMin(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

const STATUS_BG: Record<string, string> = {
  WAITING: "border-amber-500/30 bg-amber-500/5",
  CALLED: "border-sky-500/30 bg-sky-500/5",
  IN_PROGRESS: "border-emerald-500/30 bg-emerald-500/5",
};

export function DoctorDesk({
  isAdmin,
  currentDoctorId,
  userId,
}: {
  isAdmin: boolean;
  currentDoctorId: string | null;
  userId: string;
}) {
  const [allDoctors, setAllDoctors] = useState<Doctor[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(
    currentDoctorId,
  );
  const [tokens, setTokens] = useState<Token[]>([]);
  const [activeTokenId, setActiveTokenId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const selectedDoctor = allDoctors.find((d) => d.id === selectedDoctorId);

  const loadDoctors = useCallback(async () => {
    const res = await fetch("/api/doctors");
    const body = await res.json();
    if (body?.success) {
      setAllDoctors(body.data);
      if (!selectedDoctorId && body.data.length && isAdmin) {
        setSelectedDoctorId(body.data[0].id);
      }
    }
  }, [selectedDoctorId, isAdmin]);

  const loadQueue = useCallback(async () => {
    if (!selectedDoctorId) return;
    try {
      const res = await fetch(`/api/tokens?doctorId=${selectedDoctorId}&today=true`);
      const body = await res.json();
      if (body?.success) {
        const active = (body.data as Token[]).filter(
          (t) => t.status !== "COMPLETED" && t.status !== "EXPIRED" && t.status !== "CANCELLED",
        );
        setTokens(active);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedDoctorId]);

  useEffect(() => {
    loadDoctors();
  }, [loadDoctors]);

  useEffect(() => {
    loadQueue();
    if (!selectedDoctorId) return;
    const i = setInterval(loadQueue, 8000);
    return () => clearInterval(i);
  }, [loadQueue, selectedDoctorId]);

  useEffect(() => {
    // Auto-pick first in-progress or called token
    if (!activeTokenId && tokens.length > 0) {
      const priority = tokens.find((t) => t.status === "IN_PROGRESS")
        ?? tokens.find((t) => t.status === "CALLED");
      if (priority) setActiveTokenId(priority.id);
    }
  }, [tokens, activeTokenId]);

  async function callNext() {
    const next = tokens
      .filter((t) => t.status === "WAITING")
      .sort((a, b) => {
        if (a.type === "EMERGENCY" && b.type !== "EMERGENCY") return -1;
        if (b.type === "EMERGENCY" && a.type !== "EMERGENCY") return 1;
        return new Date(a.issuedAt).getTime() - new Date(b.issuedAt).getTime();
      })[0];
    if (!next) {
      toast.info("No one waiting.");
      return;
    }
    const res = await fetch(`/api/tokens/${next.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "CALLED" }),
    });
    const body = await res.json();
    if (body?.success) {
      toast.success(`Called ${next.displayToken}`);
      setActiveTokenId(next.id);
      loadQueue();
    }
  }

  const activeToken = tokens.find((t) => t.id === activeTokenId);

  return (
    <div className="flex min-h-[calc(100dvh-8rem)] flex-col gap-4 lg:flex-row">
      {/* Queue sidebar */}
      <aside className="shrink-0 lg:w-80">
        <div className="sticky top-20 space-y-3 rounded-xl border bg-card p-4">
          {isAdmin && (
            <div>
              <div className="mb-1 text-xs font-medium text-muted-foreground">
                Viewing queue for
              </div>
              <Select
                value={selectedDoctorId ?? ""}
                onValueChange={(v) => {
                  setSelectedDoctorId(v);
                  setActiveTokenId(null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pick a doctor">
                    {selectedDoctor
                      ? `${selectedDoctor.name} · ${selectedDoctor.specialization}`
                      : undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {allDoctors.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name} · {d.specialization}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {selectedDoctor && !isAdmin && (
            <DoctorStatusSwitcher
              doctorId={selectedDoctor.id}
              status={selectedDoctor.status}
              isAvailable={selectedDoctor.isAvailable}
              onChanged={loadDoctors}
            />
          )}

          <div className="flex items-center justify-between border-t pt-3">
            <div>
              <div className="text-xs text-muted-foreground">Waiting</div>
              <div className="text-xl font-semibold tabular-nums">
                {tokens.filter((t) => t.status === "WAITING").length}
              </div>
            </div>
            <button
              onClick={callNext}
              disabled={!tokens.some((t) => t.status === "WAITING")}
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
            >
              Call next
            </button>
          </div>

          <ol className="space-y-1.5">
            {loading ? (
              <li className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading queue...
              </li>
            ) : tokens.length === 0 ? (
              <li className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
                No one in the queue yet.
              </li>
            ) : (
              <AnimatePresence initial={false}>
                {tokens
                  .sort((a, b) => {
                    const order = {
                      IN_PROGRESS: 0,
                      CALLED: 1,
                      WAITING: 2,
                      COMPLETED: 3,
                      EXPIRED: 4,
                      CANCELLED: 5,
                    } as Record<string, number>;
                    if ((order[a.status] ?? 99) !== (order[b.status] ?? 99))
                      return order[a.status] - order[b.status];
                    if (a.type === "EMERGENCY" && b.type !== "EMERGENCY")
                      return -1;
                    if (b.type === "EMERGENCY" && a.type !== "EMERGENCY") return 1;
                    return (
                      new Date(a.issuedAt).getTime() -
                      new Date(b.issuedAt).getTime()
                    );
                  })
                  .map((tk) => {
                    const active = activeTokenId === tk.id;
                    return (
                      <motion.li
                        key={tk.id}
                        layout
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 6 }}
                      >
                        <button
                          onClick={() => setActiveTokenId(tk.id)}
                          className={cn(
                            "relative flex w-full items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition",
                            STATUS_BG[tk.status] ?? "bg-muted/30",
                            active && "ring-2 ring-primary/40",
                          )}
                        >
                          {tk.type === "EMERGENCY" && (
                            <span className="absolute -left-1 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full bg-destructive text-destructive-foreground">
                              <Zap className="h-3 w-3" />
                            </span>
                          )}
                          <div className="ml-3 min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-sm font-bold text-primary">
                                {tk.displayToken}
                              </span>
                              {tk.patient?.allergies &&
                                tk.patient.allergies.length > 0 && (
                                  <span className="rounded-full bg-destructive/12 px-1.5 py-0.5 text-[9px] font-medium text-destructive">
                                    allergy
                                  </span>
                                )}
                            </div>
                            <div className="truncate text-xs font-medium">
                              {tk.patient?.name}
                            </div>
                            <div className="truncate text-[10px] text-muted-foreground">
                              {tk.chiefComplaint ?? "—"}
                            </div>
                          </div>
                          <div className="text-right text-[10px] text-muted-foreground">
                            {waitedMin(tk.issuedAt)}
                          </div>
                        </button>
                      </motion.li>
                    );
                  })}
              </AnimatePresence>
            )}
          </ol>
        </div>
      </aside>

      {/* Consultation area */}
      <div className="min-w-0 flex-1">
        {activeToken ? (
          <ConsultationPanel
            token={activeToken}
            userId={userId}
            onDone={() => {
              setActiveTokenId(null);
              loadQueue();
            }}
          />
        ) : (
          <div className="flex h-full min-h-[420px] items-center justify-center rounded-xl border border-dashed bg-card/50 p-10 text-center">
            <div>
              <div className="text-sm font-medium">No patient selected</div>
              <p className="mt-1 text-xs text-muted-foreground">
                Pick a token from the queue to start the consultation.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
