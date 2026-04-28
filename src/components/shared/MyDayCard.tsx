"use client";

import { useCallback, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { usePolling } from "@/lib/hooks/usePolling";
import {
  Sparkles,
  Users,
  Stethoscope,
  Receipt,
  TrendingUp,
  Pill,
  Clock,
  UserPlus,
  BadgeDollarSign,
  AlertTriangle,
  TestTube,
  CheckCircle2,
  FlaskConical,
  BedDouble,
  ClipboardList,
} from "lucide-react";

type DoctorStats = {
  role: "DOCTOR";
  patientsSeen: number;
  queueWaiting: number;
  tokensToday: number;
  revenueCollected: number;
  revenueSharePct: number;
  myShare: number;
};

type ReceptionStats = {
  role: "RECEPTIONIST";
  registered: number;
  tokensIssued: number;
  revenueCollected: number;
  assignments: Array<{ doctorId: string; doctorName: string; count: number }>;
};

type PharmacyStats = {
  role: "PHARMACIST";
  dispensed: number;
  revenueCollected: number;
  shiftOpen: boolean;
};

type AdminStats = {
  role: "ADMIN";
  newPatients: number;
  tokensIssued: number;
  revenueCollected: number;
  outstandingDues: number;
};

type LabStats = {
  role: "LAB_TECH";
  pendingSamples: number;
  inProgress: number;
  completedToday: number;
  ordersToday: number;
};

type NurseStats = {
  role: "NURSE";
  admittedCount: number;
  freeBeds: number;
  totalBeds: number;
  notesToday: number;
};

type Stats =
  | DoctorStats
  | ReceptionStats
  | PharmacyStats
  | AdminStats
  | LabStats
  | NurseStats;

function money(n: number) {
  return `₨ ${Math.round(n).toLocaleString()}`;
}

export function MyDayCard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/stats/my-day", { cache: "no-store" });
      const body = await res.json();
      if (body?.success) setStats(body.data as Stats);
    } finally {
      setLoading(false);
    }
  }, []);

  usePolling(load, 30000);

  if (loading) {
    return (
      <div className="card-surface h-32 animate-pulse bg-muted/30 p-5" />
    );
  }
  if (!stats) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-surface overflow-hidden p-5"
    >
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-primary">
          <Sparkles className="h-3.5 w-3.5" />
        </div>
        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            My day
          </div>
          <div className="text-sm font-semibold">
            {new Date().toLocaleDateString(undefined, {
              weekday: "long",
              day: "numeric",
              month: "short",
            })}
          </div>
        </div>
      </div>

      {stats.role === "DOCTOR" && (
        <DoctorBlock s={stats} />
      )}
      {stats.role === "RECEPTIONIST" && <ReceptionBlock s={stats} />}
      {stats.role === "PHARMACIST" && <PharmacyBlock s={stats} />}
      {stats.role === "ADMIN" && <AdminBlock s={stats} />}
      {stats.role === "LAB_TECH" && <LabBlock s={stats} />}
      {stats.role === "NURSE" && <NurseBlock s={stats} />}
    </motion.div>
  );
}

function Kpi({
  icon,
  label,
  value,
  tone = "default",
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  tone?: "default" | "success" | "warning" | "info";
}) {
  const tones: Record<string, string> = {
    default: "bg-accent text-accent-foreground",
    success: "bg-emerald-500/15 text-emerald-700",
    warning: "bg-amber-500/15 text-amber-700",
    info: "bg-sky-500/15 text-sky-700",
  };
  return (
    <div className="flex items-center gap-2.5 rounded-lg border bg-card p-3">
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${tones[tone]}`}
      >
        <span className="[&>svg]:h-4 [&>svg]:w-4">{icon}</span>
      </div>
      <div className="min-w-0">
        <div className="text-[10px] text-muted-foreground">{label}</div>
        <div className="truncate text-base font-semibold tabular-nums">
          {value}
        </div>
      </div>
    </div>
  );
}

function DoctorBlock({ s }: { s: DoctorStats }) {
  return (
    <>
      <div className="grid gap-2 sm:grid-cols-4">
        <Kpi
          icon={<Stethoscope />}
          label="Patients seen"
          value={s.patientsSeen}
          tone="info"
        />
        <Kpi
          icon={<Clock />}
          label="Waiting now"
          value={s.queueWaiting}
          tone="warning"
        />
        <Kpi
          icon={<Receipt />}
          label="Revenue today"
          value={money(s.revenueCollected)}
          tone="success"
        />
        <Kpi
          icon={<TrendingUp />}
          label={`My share (${s.revenueSharePct}%)`}
          value={money(s.myShare)}
        />
      </div>
      {s.revenueSharePct === 0 && (
        <div className="mt-2 rounded-md border border-dashed bg-muted/30 p-2 text-[11px] text-muted-foreground">
          Tip: Set your revenue share % from Staff → your profile to track
          earnings automatically.
        </div>
      )}
    </>
  );
}

function ReceptionBlock({ s }: { s: ReceptionStats }) {
  return (
    <>
      <div className="grid gap-2 sm:grid-cols-3">
        <Kpi
          icon={<UserPlus />}
          label="Registered"
          value={s.registered}
          tone="info"
        />
        <Kpi
          icon={<Users />}
          label="Tokens issued"
          value={s.tokensIssued}
        />
        <Kpi
          icon={<BadgeDollarSign />}
          label="Collected today"
          value={money(s.revenueCollected)}
          tone="success"
        />
      </div>
      {s.assignments.length > 0 && (
        <div className="mt-3">
          <div className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Assigned to
          </div>
          <div className="flex flex-wrap gap-1.5">
            {s.assignments.map((a) => (
              <span
                key={a.doctorId}
                className="inline-flex items-center gap-1.5 rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground"
              >
                {a.doctorName}
                <span className="rounded-full bg-background px-1.5 py-0.5 text-[10px] font-bold">
                  {a.count}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function PharmacyBlock({ s }: { s: PharmacyStats }) {
  const [opening, setOpening] = useState(false);
  async function openShift() {
    setOpening(true);
    try {
      const res = await fetch("/api/cash-shifts/open", { method: "POST" });
      const body = await res.json();
      if (!res.ok || !body?.success) {
        toast.error(body?.error ?? "Could not open shift");
        return;
      }
      if (body.data?.alreadyOpen) {
        toast("Shift is already open");
      } else {
        toast.success("Shift opened — you can collect payments now");
      }
      // Refresh stats by reloading the page — cheap + reliable
      window.location.reload();
    } finally {
      setOpening(false);
    }
  }

  return (
    <>
      <div className="grid gap-2 sm:grid-cols-3">
        <Kpi
          icon={<Pill />}
          label="Dispensed today"
          value={s.dispensed}
          tone="info"
        />
        <Kpi
          icon={<BadgeDollarSign />}
          label="Collected today"
          value={money(s.revenueCollected)}
          tone="success"
        />
        <Kpi
          icon={<Clock />}
          label="Shift"
          value={s.shiftOpen ? "OPEN" : "closed"}
          tone={s.shiftOpen ? "success" : "default"}
        />
      </div>
      {!s.shiftOpen ? (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-md border border-dashed bg-muted/30 p-2.5 text-[11px]">
          <span className="text-muted-foreground">
            Open your cash shift before collecting payments.
          </span>
          <button
            type="button"
            onClick={openShift}
            disabled={opening}
            className="inline-flex h-7 items-center gap-1 rounded-md bg-primary px-2.5 text-[11px] font-semibold text-primary-foreground shadow-sm transition hover:brightness-95 disabled:opacity-60"
          >
            {opening ? "Opening..." : "Open shift now"}
          </button>
        </div>
      ) : (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-md bg-emerald-500/10 p-2.5 text-[11px] text-emerald-800">
          <span>Your shift is open. Declare and close it from Cash shifts at end of day.</span>
          <a
            href="/billing/shift"
            className="font-medium underline underline-offset-2 hover:text-emerald-900"
          >
            Cash shifts →
          </a>
        </div>
      )}
    </>
  );
}

function AdminBlock({ s }: { s: AdminStats }) {
  return (
    <div className="grid gap-2 sm:grid-cols-4">
      <Kpi
        icon={<UserPlus />}
        label="New patients"
        value={s.newPatients}
        tone="info"
      />
      <Kpi
        icon={<Users />}
        label="Tokens issued"
        value={s.tokensIssued}
      />
      <Kpi
        icon={<Receipt />}
        label="Collected"
        value={money(s.revenueCollected)}
        tone="success"
      />
      <Kpi
        icon={<AlertTriangle />}
        label="Outstanding"
        value={money(s.outstandingDues)}
        tone="warning"
      />
    </div>
  );
}

function LabBlock({ s }: { s: LabStats }) {
  return (
    <>
      <div className="grid gap-2 sm:grid-cols-4">
        <Kpi
          icon={<TestTube />}
          label="Awaiting sample"
          value={s.pendingSamples}
          tone={s.pendingSamples > 0 ? "warning" : "default"}
        />
        <Kpi
          icon={<FlaskConical />}
          label="In progress"
          value={s.inProgress}
          tone="info"
        />
        <Kpi
          icon={<CheckCircle2 />}
          label="Completed today"
          value={s.completedToday}
          tone="success"
        />
        <Kpi
          icon={<ClipboardList />}
          label="Orders today"
          value={s.ordersToday}
        />
      </div>
      {s.pendingSamples > 0 && (
        <div className="mt-2 rounded-md border border-dashed bg-amber-500/10 p-2 text-[11px] text-amber-800">
          {s.pendingSamples} order{s.pendingSamples === 1 ? "" : "s"} waiting
          for sample collection — start with the oldest.
        </div>
      )}
    </>
  );
}

function NurseBlock({ s }: { s: NurseStats }) {
  const occupancy =
    s.totalBeds > 0 ? Math.round((1 - s.freeBeds / s.totalBeds) * 100) : 0;
  return (
    <>
      <div className="grid gap-2 sm:grid-cols-4">
        <Kpi
          icon={<BedDouble />}
          label="Admitted"
          value={s.admittedCount}
          tone="info"
        />
        <Kpi
          icon={<BedDouble />}
          label="Free beds"
          value={`${s.freeBeds}/${s.totalBeds}`}
          tone={s.freeBeds === 0 ? "warning" : "success"}
        />
        <Kpi
          icon={<TrendingUp />}
          label="Occupancy"
          value={`${occupancy}%`}
        />
        <Kpi
          icon={<ClipboardList />}
          label="My notes today"
          value={s.notesToday}
        />
      </div>
      {s.totalBeds === 0 && (
        <div className="mt-2 rounded-md border border-dashed bg-muted/30 p-2 text-[11px] text-muted-foreground">
          Tip: Set up beds and wards from IPD → Manage beds.
        </div>
      )}
    </>
  );
}
