"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  Zap,
  ListChecks,
  Stethoscope,
  CheckCircle2,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/shared/EmptyState";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { usePolling } from "@/lib/hooks/usePolling";
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
  const [completedTokens, setCompletedTokens] = useState<Token[]>([]);
  // Default expanded — doctor frequently re-opens completed consultations
  // to amend medicines / notes (see ConsultationPanel edit-mode banner).
  const [showCompleted, setShowCompleted] = useState(true);
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

  const loadQueue = useCallback(async (): Promise<Token[]> => {
    if (!selectedDoctorId) return [];
    try {
      const res = await fetch(`/api/tokens?doctorId=${selectedDoctorId}&today=true`);
      const body = await res.json();
      if (body?.success) {
        const all = body.data as Token[];
        const active = all.filter(
          (t) => t.status !== "COMPLETED" && t.status !== "EXPIRED" && t.status !== "CANCELLED",
        );
        const completed = all.filter((t) => t.status === "COMPLETED");
        setTokens(active);
        setCompletedTokens(completed);
        return active;
      }
      return [];
    } finally {
      setLoading(false);
    }
  }, [selectedDoctorId]);

  // After a consultation is completed/referred, jump straight to the next
  // waiting patient instead of dropping the doctor on an empty screen.
  // Emergencies float to the top — same priority as `Call next`.
  function pickNextActive(list: Token[]): Token | null {
    const sorted = [...list].sort((a, b) => {
      if (a.type === "EMERGENCY" && b.type !== "EMERGENCY") return -1;
      if (b.type === "EMERGENCY" && a.type !== "EMERGENCY") return 1;
      return new Date(a.issuedAt).getTime() - new Date(b.issuedAt).getTime();
    });
    return (
      sorted.find((t) => t.status === "IN_PROGRESS") ??
      sorted.find((t) => t.status === "CALLED") ??
      sorted.find((t) => t.status === "WAITING") ??
      null
    );
  }

  useEffect(() => {
    loadDoctors();
  }, [loadDoctors]);

  // loadQueue itself no-ops when selectedDoctorId is null, so polling is safe.
  usePolling(() => {
    void loadQueue();
  }, 8000);

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
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body?.success) {
      toast.error(body?.error ?? "Could not call next");
      return;
    }
    toast.success(`Called ${next.displayToken}`);
    setActiveTokenId(next.id);
    loadQueue();
  }

  const activeToken =
    tokens.find((t) => t.id === activeTokenId) ??
    completedTokens.find((t) => t.id === activeTokenId);

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
              {allDoctors.length > 0 ? (
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
              ) : (
                <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 p-3 text-xs">
                  <div className="font-semibold text-foreground">
                    No doctors yet
                  </div>
                  <p className="mt-1 leading-relaxed text-muted-foreground">
                    Add a doctor from{" "}
                    <a href="/staff" className="font-medium text-primary hover:underline">
                      Staff
                    </a>
                    , or if you see patients yourself, turn on your own doctor
                    profile at{" "}
                    <a
                      href="/profile"
                      className="font-medium text-primary hover:underline"
                    >
                      My profile
                    </a>
                    .
                  </p>
                </div>
              )}
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
              <li>
                <EmptyState
                  icon={ListChecks}
                  title="No tokens in your queue"
                  description="As reception issues tokens for you, they will show up here automatically."
                  className="p-6"
                />
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

          {completedTokens.length > 0 && (
            <div className="mt-3 border-t pt-3">
              <button
                type="button"
                onClick={() => setShowCompleted((s) => !s)}
                className="flex w-full items-center justify-between rounded-md px-1 py-1 text-left text-xs font-medium text-muted-foreground transition hover:bg-muted/40"
              >
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                  Completed today ({completedTokens.length})
                </span>
                <ChevronDown
                  className={cn(
                    "h-3 w-3 transition",
                    showCompleted && "rotate-180",
                  )}
                />
              </button>
              {showCompleted && (
                <ol className="mt-2 space-y-1.5">
                  {completedTokens.map((tk) => {
                    const active = activeTokenId === tk.id;
                    return (
                      <li key={tk.id}>
                        <button
                          onClick={() => setActiveTokenId(tk.id)}
                          className={cn(
                            "flex w-full items-center gap-2 rounded-lg border bg-emerald-500/5 px-2.5 py-2 text-left transition hover:bg-emerald-500/10",
                            active && "ring-2 ring-primary/40",
                          )}
                          title="Open to amend medicines / notes"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-[11px] font-bold text-emerald-700">
                                {tk.displayToken}
                              </span>
                            </div>
                            <div className="truncate text-xs font-medium">
                              {tk.patient?.name}
                            </div>
                          </div>
                          <span className="rounded-full border border-emerald-500/30 bg-background px-1.5 py-0.5 text-[9px] font-medium text-emerald-700">
                            Edit
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* Consultation area */}
      <div className="min-w-0 flex-1">
        {activeToken ? (
          <ConsultationPanel
            token={activeToken}
            userId={userId}
            onDone={async () => {
              setActiveTokenId(null);
              const fresh = await loadQueue();
              const next = pickNextActive(fresh);
              if (next) setActiveTokenId(next.id);
            }}
          />
        ) : (
          <NextPatientEmptyState
            tokens={tokens}
            onPick={(id) => setActiveTokenId(id)}
          />
        )}
      </div>
    </div>
  );
}

// Empty state for the consultation pane. When the queue has waiting
// patients, show the next one as a clickable card so the doctor never
// has to hunt for it. Falls back to a plain message when the queue is
// empty.
function NextPatientEmptyState({
  tokens,
  onPick,
}: {
  tokens: Token[];
  onPick: (id: string) => void;
}) {
  const next = (() => {
    const sorted = [...tokens].sort((a, b) => {
      if (a.type === "EMERGENCY" && b.type !== "EMERGENCY") return -1;
      if (b.type === "EMERGENCY" && a.type !== "EMERGENCY") return 1;
      return new Date(a.issuedAt).getTime() - new Date(b.issuedAt).getTime();
    });
    return (
      sorted.find((t) => t.status === "IN_PROGRESS") ??
      sorted.find((t) => t.status === "CALLED") ??
      sorted.find((t) => t.status === "WAITING") ??
      null
    );
  })();

  if (!next) {
    return (
      <div className="flex h-full min-h-[420px] items-center justify-center">
        <EmptyState
          icon={Stethoscope}
          title="No patient in queue"
          description="As reception issues tokens for you, they will show up on the left."
          className="w-full"
        />
      </div>
    );
  }

  const waiters = tokens.filter((t) => t.status === "WAITING").length;

  return (
    <div className="flex h-full min-h-[420px] items-center justify-center">
      <motion.button
        type="button"
        onClick={() => onPick(next.id)}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        className="group w-full max-w-md rounded-2xl border-2 border-dashed border-primary/30 bg-card p-8 text-left shadow-sm transition hover:border-primary/60 hover:shadow-md"
      >
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <Stethoscope className="h-3.5 w-3.5" />
          {next.status === "WAITING" ? "Next in queue" : "Continue with"}
        </div>
        <div className="mt-2 flex items-baseline gap-3">
          <span className="font-mono text-3xl font-bold text-primary">
            {next.displayToken}
          </span>
          {next.type === "EMERGENCY" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-semibold text-destructive">
              <Zap className="h-3 w-3" />
              Emergency
            </span>
          )}
        </div>
        <div className="mt-1 text-lg font-semibold">
          {next.patient?.name ?? "Patient"}
        </div>
        {next.chiefComplaint && (
          <div className="mt-1 line-clamp-2 text-sm text-muted-foreground">
            {next.chiefComplaint}
          </div>
        )}
        <div className="mt-5 flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            {waiters > 1 && `${waiters - (next.status === "WAITING" ? 1 : 0)} more waiting`}
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground transition group-hover:brightness-110">
            Start consultation →
          </span>
        </div>
      </motion.button>
    </div>
  );
}
