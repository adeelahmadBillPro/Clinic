"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  UserPlus,
  Users,
  Stethoscope,
  Pill,
  Receipt,
  CalendarDays,
  FlaskConical,
  BedDouble,
  Activity,
  Loader2,
  ShieldCheck,
  History,
  EyeOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/shared/EmptyState";
import { toast } from "sonner";

type Entry = {
  time: string;
  action: string;
  by: string;
  summary: string;
  kind:
    | "registration"
    | "update"
    | "token"
    | "consultation"
    | "prescription"
    | "bill"
    | "appointment"
    | "pharmacy"
    | "lab"
    | "ipd"
    | "audit";
  reference?: string;
};

type ApiResponse = {
  success: boolean;
  data?: {
    entries: Entry[];
    phi: boolean;
    nextBefore: string | null;
  };
  error?: string;
};

const KIND_STYLE: Record<
  Entry["kind"],
  { bg: string; ring: string; icon: React.ReactNode }
> = {
  registration: {
    bg: "bg-sky-500/15 text-sky-700",
    ring: "ring-sky-500/30",
    icon: <UserPlus className="h-3.5 w-3.5" />,
  },
  update: {
    bg: "bg-slate-500/15 text-slate-700",
    ring: "ring-slate-500/30",
    icon: <ShieldCheck className="h-3.5 w-3.5" />,
  },
  token: {
    bg: "bg-amber-500/15 text-amber-700",
    ring: "ring-amber-500/30",
    icon: <Users className="h-3.5 w-3.5" />,
  },
  consultation: {
    bg: "bg-primary/15 text-primary",
    ring: "ring-primary/30",
    icon: <Stethoscope className="h-3.5 w-3.5" />,
  },
  prescription: {
    bg: "bg-emerald-500/15 text-emerald-700",
    ring: "ring-emerald-500/30",
    icon: <Pill className="h-3.5 w-3.5" />,
  },
  bill: {
    bg: "bg-violet-500/15 text-violet-700",
    ring: "ring-violet-500/30",
    icon: <Receipt className="h-3.5 w-3.5" />,
  },
  appointment: {
    bg: "bg-sky-500/15 text-sky-700",
    ring: "ring-sky-500/30",
    icon: <CalendarDays className="h-3.5 w-3.5" />,
  },
  pharmacy: {
    bg: "bg-emerald-500/15 text-emerald-700",
    ring: "ring-emerald-500/30",
    icon: <Pill className="h-3.5 w-3.5" />,
  },
  lab: {
    bg: "bg-fuchsia-500/15 text-fuchsia-700",
    ring: "ring-fuchsia-500/30",
    icon: <FlaskConical className="h-3.5 w-3.5" />,
  },
  ipd: {
    bg: "bg-rose-500/15 text-rose-700",
    ring: "ring-rose-500/30",
    icon: <BedDouble className="h-3.5 w-3.5" />,
  },
  audit: {
    bg: "bg-muted text-muted-foreground",
    ring: "ring-border",
    icon: <Activity className="h-3.5 w-3.5" />,
  },
};

// "Today", "Yesterday", or "12 Apr 2026" — used for sticky day headers.
function dayHeading(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const startOf = (x: Date) =>
    new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  const diff = Math.round((startOf(now) - startOf(d)) / dayMs);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return d.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function timeOnly(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function PatientActivityTimeline({
  patientId,
}: {
  patientId: string;
}) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [phi, setPhi] = useState<boolean>(true);
  const [nextBefore, setNextBefore] = useState<string | null>(null);

  useEffect(() => {
    let abort = false;
    setLoading(true);
    fetch(`/api/patients/${patientId}/activity?limit=50`)
      .then((r) => r.json() as Promise<ApiResponse>)
      .then((body) => {
        if (abort) return;
        if (body?.success && body.data) {
          setEntries(body.data.entries);
          setPhi(body.data.phi);
          setNextBefore(body.data.nextBefore);
        } else {
          toast.error(body?.error ?? "Could not load activity");
        }
      })
      .catch(() => {
        if (!abort) toast.error("Could not load activity");
      })
      .finally(() => {
        if (!abort) setLoading(false);
      });
    return () => {
      abort = true;
    };
  }, [patientId]);

  async function loadMore() {
    if (!nextBefore || loadingMore) return;
    setLoadingMore(true);
    try {
      const r = await fetch(
        `/api/patients/${patientId}/activity?before=${encodeURIComponent(
          nextBefore,
        )}&limit=50`,
      );
      const body: ApiResponse = await r.json();
      if (body?.success && body.data) {
        setEntries((prev) => [...prev, ...body.data!.entries]);
        setNextBefore(body.data.nextBefore);
      } else {
        toast.error(body?.error ?? "Could not load more");
      }
    } catch {
      toast.error("Could not load more");
    } finally {
      setLoadingMore(false);
    }
  }

  // Group entries by day, preserving the (newest-first) order from the
  // API.
  const groups: { key: string; label: string; items: Entry[] }[] = [];
  for (const e of entries) {
    const key = dayKey(e.time);
    const last = groups[groups.length - 1];
    if (last && last.key === key) {
      last.items.push(e);
    } else {
      groups.push({ key, label: dayHeading(e.time), items: [e] });
    }
  }

  return (
    <div className="card-surface p-5">
      <div className="mb-4 flex items-center gap-2">
        <Activity className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Activity timeline</h3>
        <span className="ml-auto text-xs text-muted-foreground">
          {entries.length} {entries.length === 1 ? "entry" : "entries"}
        </span>
      </div>

      {!phi && !loading && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-900 dark:text-amber-200">
          <EyeOff className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Clinical events hidden — only admins, doctors, and nurses see
            consultations and prescriptions.
          </span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Loading activity…
        </div>
      ) : entries.length === 0 ? (
        <EmptyState
          icon={History}
          title="No activity yet"
          description="As the patient is seen, billed, prescribed, or admitted, every event will land here."
          className="border-none bg-transparent p-6"
        />
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <div key={group.key}>
              <div className="sticky top-0 z-10 -mx-5 mb-2 bg-card/95 px-5 py-1 backdrop-blur supports-[backdrop-filter]:bg-card/75">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {group.label}
                </div>
              </div>
              <ol className="relative space-y-3 border-l border-border pl-5">
                {group.items.map((e, i) => {
                  const style = KIND_STYLE[e.kind];
                  return (
                    <motion.li
                      key={`${e.time}-${i}`}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{
                        duration: 0.18,
                        delay: Math.min(i, 12) * 0.03,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                      className="relative"
                    >
                      <span
                        className={cn(
                          "absolute -left-[30px] top-1 flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-card",
                          style.bg,
                        )}
                      >
                        {style.icon}
                      </span>
                      <div className="rounded-lg border bg-card/80 p-3 text-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="font-medium">{e.action}</div>
                          <time
                            dateTime={e.time}
                            title={new Date(e.time).toLocaleString()}
                            className="text-[10px] text-muted-foreground"
                          >
                            {timeOnly(e.time)}
                          </time>
                        </div>
                        {e.summary && (
                          <div className="mt-1 text-xs text-muted-foreground">
                            {e.summary}
                          </div>
                        )}
                        <div className="mt-1 text-[10px] text-muted-foreground">
                          by{" "}
                          <span className="font-medium text-foreground">
                            {e.by}
                          </span>
                        </div>
                      </div>
                    </motion.li>
                  );
                })}
              </ol>
            </div>
          ))}

          {nextBefore && (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border bg-card px-3 text-xs font-medium hover:bg-accent disabled:opacity-60"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Loading…
                  </>
                ) : (
                  "Load more"
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
