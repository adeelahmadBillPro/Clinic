"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { UserPlus, Search, X, Loader2, Users } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { RegisterPatientForm } from "./RegisterPatientForm";

type Row = {
  id: string;
  mrn: string;
  name: string;
  phone: string;
  gender: string;
  dob: string | null;
  bloodGroup: string | null;
  allergies: string[];
  createdAt: string;
  todayStatus: string | null;
  todayToken: string | null;
};

type StatusFilter = "ALL" | "WAITING" | "CALLED" | "IN_PROGRESS" | "COMPLETED";

const STATUS_CHIP: Record<
  string,
  { label: string; tone: string; dot: string }
> = {
  WAITING: {
    label: "Waiting",
    tone: "bg-amber-500/15 text-amber-700 border-amber-500/30",
    dot: "bg-amber-500",
  },
  CALLED: {
    label: "Called",
    tone: "bg-sky-500/15 text-sky-700 border-sky-500/30",
    dot: "bg-sky-500",
  },
  IN_PROGRESS: {
    label: "In progress",
    tone: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
    dot: "bg-emerald-500 animate-pulse",
  },
  COMPLETED: {
    label: "Completed",
    tone: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
    dot: "bg-emerald-600",
  },
};

function ageFromDob(dob: string | null) {
  if (!dob) return null;
  const diff = Date.now() - new Date(dob).getTime();
  const years = Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
  return years;
}

export function PatientsClient({ initial }: { initial: Row[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Row[]>(initial);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  // Counts driven off the unfiltered `rows` so chip totals don't change
  // when the filter is applied.
  const counts = useMemo(() => {
    const c = { ALL: rows.length, WAITING: 0, CALLED: 0, IN_PROGRESS: 0, COMPLETED: 0 };
    for (const r of rows) {
      if (r.todayStatus && r.todayStatus in c) {
        c[r.todayStatus as keyof typeof c]++;
      }
    }
    return c;
  }, [rows]);

  const visible = useMemo(() => {
    if (statusFilter === "ALL") return rows;
    return rows.filter((r) => r.todayStatus === statusFilter);
  }, [rows, statusFilter]);

  useEffect(() => {
    if (!q.trim()) {
      setRows(initial);
      return;
    }
    // Cancel in-flight fetches when the query changes — see PatientSearch
    // for the same pattern.
    const ac = new AbortController();
    const handle = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/patients?q=${encodeURIComponent(q)}&limit=50`,
          { signal: ac.signal },
        );
        const body = await res.json();
        if (body?.success) {
          setRows(
            (body.data as Row[]).map((p) => ({
              ...p,
              dob: p.dob,
              createdAt: p.createdAt,
            })),
          );
        }
      } catch (e) {
        if ((e as Error).name !== "AbortError") throw e;
      } finally {
        setLoading(false);
      }
    }, 220);
    return () => {
      clearTimeout(handle);
      ac.abort();
    };
  }, [q, initial]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="h-11 pl-9 pr-9"
            placeholder="Search by name, phone, or MRN..."
          />
          {loading ? (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          ) : (
            q && (
              <button
                type="button"
                onClick={() => setQ("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted"
                aria-label="Clear"
              >
                <X className="h-4 w-4" />
              </button>
            )
          )}
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-1.5 h-3.5 w-3.5" />
              New patient
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Register a new patient</DialogTitle>
            </DialogHeader>
            <RegisterPatientForm
              onCreated={(p) => {
                setOpen(false);
                router.refresh();
                if (p.id) router.push(`/patients/${p.id}`);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Today's status filter chips. Counts come from the current
          `rows` list (search results or recent), so they stay relevant
          when the user types a query. */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
          Today
        </span>
        <FilterChip
          label="All"
          count={counts.ALL}
          active={statusFilter === "ALL"}
          onClick={() => setStatusFilter("ALL")}
        />
        <FilterChip
          label="Waiting"
          count={counts.WAITING}
          active={statusFilter === "WAITING"}
          tone="amber"
          onClick={() => setStatusFilter("WAITING")}
        />
        <FilterChip
          label="Called"
          count={counts.CALLED}
          active={statusFilter === "CALLED"}
          tone="sky"
          onClick={() => setStatusFilter("CALLED")}
        />
        <FilterChip
          label="In progress"
          count={counts.IN_PROGRESS}
          active={statusFilter === "IN_PROGRESS"}
          tone="emerald"
          onClick={() => setStatusFilter("IN_PROGRESS")}
        />
        <FilterChip
          label="Completed"
          count={counts.COMPLETED}
          active={statusFilter === "COMPLETED"}
          tone="emerald"
          onClick={() => setStatusFilter("COMPLETED")}
        />
      </div>

      {visible.length === 0 ? (
        statusFilter !== "ALL" ? (
          <EmptyState
            icon={Search}
            title={`No "${STATUS_CHIP[statusFilter]?.label ?? statusFilter}" patients today`}
            description="Try a different filter or clear the filter to see all patients."
            actionLabel="Show all"
            onAction={() => setStatusFilter("ALL")}
          />
        ) : q.trim() ? (
          <EmptyState
            icon={Search}
            title={`No matches for "${q}"`}
            description="Try a different name, phone number, or MRN."
          />
        ) : (
          <EmptyState
            icon={Users}
            title="No patients yet"
            description="Register your first patient to start issuing tokens, taking consultations, and generating bills."
            actionLabel="Register first patient"
            onAction={() => setOpen(true)}
          />
        )
      ) : (
        <motion.ul
          initial="initial"
          animate="animate"
          variants={{
            animate: { transition: { staggerChildren: 0.03 } },
          }}
          className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3"
        >
          {visible.map((p) => {
            const age = ageFromDob(p.dob);
            const chip = p.todayStatus ? STATUS_CHIP[p.todayStatus] : null;
            return (
              <motion.li
                key={p.id}
                variants={{
                  initial: { opacity: 0, y: 6 },
                  animate: { opacity: 1, y: 0 },
                }}
              >
                <Link
                  href={`/patients/${p.id}`}
                  className="group block rounded-xl border bg-card p-4 transition hover:border-primary/40 hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 font-medium">
                        {p.name}
                        {p.allergies.length > 0 && (
                          <Badge
                            variant="secondary"
                            className="bg-destructive/10 text-[10px] text-destructive"
                          >
                            allergy
                          </Badge>
                        )}
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {p.mrn} · {p.phone}
                      </div>
                    </div>
                    {p.bloodGroup && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                        {p.bloodGroup}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{p.gender === "M" ? "Male" : p.gender === "F" ? "Female" : "Other"}</span>
                    {age !== null && <span>· {age} yrs</span>}
                  </div>
                  {chip && (
                    <div className="mt-2.5 flex items-center justify-between gap-2 border-t pt-2">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium",
                          chip.tone,
                        )}
                      >
                        <span className={cn("h-1.5 w-1.5 rounded-full", chip.dot)} />
                        {chip.label}
                      </span>
                      {p.todayToken && (
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {p.todayToken}
                        </span>
                      )}
                    </div>
                  )}
                </Link>
              </motion.li>
            );
          })}
        </motion.ul>
      )}
    </div>
  );
}

function FilterChip({
  label,
  count,
  active,
  onClick,
  tone,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  tone?: "amber" | "sky" | "emerald";
}) {
  const activeTones: Record<string, string> = {
    amber: "border-amber-500/40 bg-amber-500/15 text-amber-800",
    sky: "border-sky-500/40 bg-sky-500/15 text-sky-800",
    emerald: "border-emerald-500/40 bg-emerald-500/15 text-emerald-800",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition",
        active
          ? tone
            ? activeTones[tone]
            : "border-primary/40 bg-primary/15 text-primary"
          : "border-border bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground",
      )}
    >
      {label}
      <span
        className={cn(
          "rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
          active ? "bg-background/60" : "bg-muted",
        )}
      >
        {count}
      </span>
    </button>
  );
}
