"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Stethoscope,
  Users,
  RefreshCcw,
  Loader2,
  TrendingUp,
  Clock,
} from "lucide-react";

type DoctorRow = {
  id: string;
  name: string;
  specialization: string;
  patientsSeen: number;
  waiting: number;
  revenueCollected: number;
  revenueSharePct: number;
  share: number;
};

type StaffRow = {
  id: string;
  name: string;
  role: string;
  tokensIssued: number;
  revenueCollected: number;
};

const ROLE_LABEL: Record<string, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  DOCTOR: "Doctor",
  RECEPTIONIST: "Receptionist",
  NURSE: "Nurse",
  PHARMACIST: "Pharmacist",
  LAB_TECH: "Lab Tech",
};

function money(n: number) {
  return `₨ ${Math.round(n).toLocaleString()}`;
}

export function TeamPerformanceTable() {
  const [doctors, setDoctors] = useState<DoctorRow[]>([]);
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/stats/team-today", { cache: "no-store" });
      const body = await res.json();
      if (body?.success) {
        setDoctors(body.data.doctors);
        setStaff(body.data.staff);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const i = setInterval(load, 30000);
    return () => clearInterval(i);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid gap-4 lg:grid-cols-2"
    >
      {/* Doctors today */}
      <div className="card-surface p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Stethoscope className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Doctors today</h3>
          </div>
          <button
            type="button"
            onClick={load}
            aria-label="Refresh"
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCcw className="h-3.5 w-3.5" />
            )}
          </button>
        </div>

        {doctors.length === 0 ? (
          <div className="py-6 text-center text-xs text-muted-foreground">
            No doctors yet — add from{" "}
            <a href="/staff" className="font-medium text-primary hover:underline">
              Staff
            </a>
            .
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  <th className="px-3 py-2 text-left">Doctor</th>
                  <th className="w-16 px-3 py-2 text-right">Seen</th>
                  <th className="w-16 px-3 py-2 text-right">Waiting</th>
                  <th className="w-24 px-3 py-2 text-right">Revenue</th>
                  <th className="w-24 px-3 py-2 text-right">Share</th>
                </tr>
              </thead>
              <tbody>
                {doctors.map((d) => (
                  <tr key={d.id} className="border-t transition hover:bg-accent/30">
                    <td className="px-3 py-2">
                      <div className="font-medium">{d.name}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {d.specialization}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {d.patientsSeen}
                    </td>
                    <td className="px-3 py-2 text-right text-amber-700 tabular-nums">
                      {d.waiting > 0 ? (
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {d.waiting}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right font-medium tabular-nums">
                      {money(d.revenueCollected)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {d.revenueSharePct > 0 ? (
                        <span className="text-emerald-700">
                          {money(d.share)}
                          <span className="ml-1 text-[9px] text-muted-foreground">
                            {d.revenueSharePct}%
                          </span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Staff collections */}
      <div className="card-surface p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Staff collections today</h3>
          </div>
          <button
            type="button"
            onClick={load}
            aria-label="Refresh"
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCcw className="h-3.5 w-3.5" />
            )}
          </button>
        </div>

        {staff.length === 0 ? (
          <div className="py-6 text-center text-xs text-muted-foreground">
            No staff activity yet today.
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  <th className="px-3 py-2 text-left">Person</th>
                  <th className="w-20 px-3 py-2 text-right">Tokens</th>
                  <th className="w-28 px-3 py-2 text-right">Collected</th>
                </tr>
              </thead>
              <tbody>
                {staff.map((s) => (
                  <tr key={s.id} className="border-t transition hover:bg-accent/30">
                    <td className="px-3 py-2">
                      <div className="font-medium">{s.name}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {ROLE_LABEL[s.role] ?? s.role}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {s.tokensIssued > 0 ? s.tokensIssued : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-3 py-2 text-right font-medium tabular-nums">
                      <span className="inline-flex items-center gap-1 text-emerald-700">
                        <TrendingUp className="h-3 w-3" />
                        {money(s.revenueCollected)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </motion.div>
  );
}
