"use client";

import { useEffect, useState } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";

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

const KIND_STYLE: Record<Entry["kind"], { bg: string; icon: React.ReactNode }> =
  {
    registration: {
      bg: "bg-sky-500/15 text-sky-700",
      icon: <UserPlus className="h-3.5 w-3.5" />,
    },
    update: {
      bg: "bg-slate-500/15 text-slate-700",
      icon: <ShieldCheck className="h-3.5 w-3.5" />,
    },
    token: {
      bg: "bg-amber-500/15 text-amber-700",
      icon: <Users className="h-3.5 w-3.5" />,
    },
    consultation: {
      bg: "bg-primary/15 text-primary",
      icon: <Stethoscope className="h-3.5 w-3.5" />,
    },
    prescription: {
      bg: "bg-emerald-500/15 text-emerald-700",
      icon: <Pill className="h-3.5 w-3.5" />,
    },
    bill: {
      bg: "bg-violet-500/15 text-violet-700",
      icon: <Receipt className="h-3.5 w-3.5" />,
    },
    appointment: {
      bg: "bg-sky-500/15 text-sky-700",
      icon: <CalendarDays className="h-3.5 w-3.5" />,
    },
    pharmacy: {
      bg: "bg-emerald-500/15 text-emerald-700",
      icon: <Pill className="h-3.5 w-3.5" />,
    },
    lab: {
      bg: "bg-fuchsia-500/15 text-fuchsia-700",
      icon: <FlaskConical className="h-3.5 w-3.5" />,
    },
    ipd: {
      bg: "bg-rose-500/15 text-rose-700",
      icon: <BedDouble className="h-3.5 w-3.5" />,
    },
    audit: {
      bg: "bg-muted text-muted-foreground",
      icon: <Activity className="h-3.5 w-3.5" />,
    },
  };

export function PatientActivityTimeline({
  patientId,
}: {
  patientId: string;
}) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let abort = false;
    setLoading(true);
    fetch(`/api/patients/${patientId}/activity`)
      .then((r) => r.json())
      .then((body) => {
        if (!abort && body?.success) setEntries(body.data.entries);
      })
      .finally(() => {
        if (!abort) setLoading(false);
      });
    return () => {
      abort = true;
    };
  }, [patientId]);

  return (
    <div className="card-surface p-5">
      <div className="mb-3 flex items-center gap-2">
        <Activity className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Full activity timeline</h3>
        <span className="ml-auto text-xs text-muted-foreground">
          {entries.length} {entries.length === 1 ? "entry" : "entries"}
        </span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-8 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Loading...
        </div>
      ) : entries.length === 0 ? (
        <div className="py-8 text-center text-xs text-muted-foreground">
          No activity yet.
        </div>
      ) : (
        <ol className="relative space-y-3 border-l border-border pl-5">
          {entries.map((e, i) => {
            const t = new Date(e.time);
            const style = KIND_STYLE[e.kind];
            return (
              <li key={i} className="relative">
                <span
                  className={cn(
                    "absolute -left-[30px] top-0 flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-card",
                    style.bg,
                  )}
                >
                  {style.icon}
                </span>
                <div className="rounded-lg border bg-card p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-medium">{e.action}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {t.toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </div>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {e.summary}
                  </div>
                  <div className="mt-1 text-[10px] text-muted-foreground">
                    by <span className="font-medium text-foreground">{e.by}</span>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
