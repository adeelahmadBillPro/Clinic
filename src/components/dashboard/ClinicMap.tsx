"use client";

import { motion } from "framer-motion";
import {
  Stethoscope,
  BedDouble,
  CircleUserRound,
  Pill,
  BanknoteArrowDown,
} from "lucide-react";
import type { ClinicMap as ClinicMapData } from "@/lib/dashboard";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_MAP: Record<
  string,
  { label: string; dot: string; ring: string }
> = {
  AVAILABLE: {
    label: "Available",
    dot: "bg-emerald-500",
    ring: "ring-emerald-500/30",
  },
  BUSY: {
    label: "Busy",
    dot: "bg-amber-500",
    ring: "ring-amber-500/30",
  },
  ON_BREAK: {
    label: "On break",
    dot: "bg-slate-400",
    ring: "ring-slate-400/30",
  },
  OFF_DUTY: {
    label: "Off duty",
    dot: "bg-slate-300",
    ring: "ring-slate-300/30",
  },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.05, delayChildren: 0.1 } },
};

const rise = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

function money(n: number) {
  return `₨ ${Math.round(n).toLocaleString()}`;
}

export function ClinicMap({ map }: { map: ClinicMapData }) {
  const hasDoctors = map.doctors.length > 0;

  return (
    <motion.div
      variants={stagger}
      initial="initial"
      animate="animate"
      className="grid gap-4 lg:grid-cols-[1.6fr_1fr]"
    >
      {/* Doctor rooms */}
      <motion.div
        variants={rise}
        className="rounded-xl bg-card p-5 ring-1 ring-border"
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Doctor rooms</h3>
            <p className="text-xs text-muted-foreground">
              Live status across your clinic
            </p>
          </div>
          <Badge variant="secondary">
            {map.doctors.length} {map.doctors.length === 1 ? "doctor" : "doctors"}
          </Badge>
        </div>

        {!hasDoctors ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            No doctors yet — add your first one from{" "}
            <a
              href="/staff"
              className="font-medium text-primary hover:underline"
            >
              Staff
            </a>
            .
          </div>
        ) : (
          <motion.div
            variants={stagger}
            className="grid gap-3 sm:grid-cols-2"
          >
            {map.doctors.map((doc) => {
              const s = STATUS_MAP[doc.status] ?? STATUS_MAP.OFF_DUTY;
              return (
                <motion.div
                  key={doc.id}
                  variants={rise}
                  className={cn(
                    "relative overflow-hidden rounded-lg border bg-background p-3.5 ring-1",
                    s.ring,
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "inline-block h-2 w-2 rounded-full",
                            s.dot,
                          )}
                        />
                        <span className="text-xs font-medium text-muted-foreground">
                          {s.label}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-1.5 text-sm font-semibold">
                        <Stethoscope className="h-3.5 w-3.5 text-muted-foreground" />
                        {doc.name}
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {doc.specialization}
                        {doc.roomNumber && <> · Room {doc.roomNumber}</>}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        Waiting
                      </div>
                      <div className="text-xl font-bold tabular-nums">
                        {doc.waitingCount}
                      </div>
                    </div>
                  </div>
                  {doc.currentToken && (
                    <div className="mt-3 rounded-md bg-primary/8 px-2.5 py-1.5 text-xs">
                      <span className="font-medium text-primary">
                        {doc.currentToken}
                      </span>{" "}
                      <span className="text-muted-foreground">
                        {doc.currentPatientName ?? "In session"}
                      </span>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </motion.div>

      {/* Sidebar stack */}
      <motion.div variants={stagger} className="space-y-3">
        <motion.div
          variants={rise}
          className="rounded-xl bg-card p-4 ring-1 ring-border"
        >
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <CircleUserRound className="h-4.5 w-4.5" />
            </div>
            <div className="text-sm font-semibold">Reception</div>
          </div>
          <div className="mt-3 flex items-end gap-2">
            <BanknoteArrowDown className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Cash collected today
              </div>
              <div className="text-xl font-semibold tabular-nums">
                {money(map.receptionCash)}
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          variants={rise}
          className="rounded-xl bg-card p-4 ring-1 ring-border"
        >
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Pill className="h-4.5 w-4.5" />
            </div>
            <div className="text-sm font-semibold">Pharmacy</div>
          </div>
          <div className="mt-3">
            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Pending prescriptions
            </div>
            <div className="text-xl font-semibold tabular-nums">
              {map.pharmacyPending}
            </div>
          </div>
        </motion.div>

        <motion.div
          variants={rise}
          className="rounded-xl bg-card p-4 ring-1 ring-border"
        >
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <BedDouble className="h-4.5 w-4.5" />
            </div>
            <div className="text-sm font-semibold">Beds</div>
          </div>
          <div className="mt-3 flex items-baseline gap-3">
            <div>
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Occupied
              </div>
              <div className="text-xl font-semibold tabular-nums">
                {map.bedsOccupied}
              </div>
            </div>
            <div className="h-8 w-px bg-border" />
            <div>
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Available
              </div>
              <div className="text-xl font-semibold tabular-nums">
                {map.bedsAvailable}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
