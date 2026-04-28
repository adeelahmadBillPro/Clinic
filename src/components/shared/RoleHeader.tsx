"use client";

import type { Role } from "@prisma/client";
import { motion } from "framer-motion";
import {
  Stethoscope,
  ClipboardList,
  Pill,
  TestTube,
  BedDouble,
  Building2,
  ShieldCheck,
} from "lucide-react";

const ROLE_META: Record<
  Role,
  { label: string; icon: React.ComponentType<{ className?: string }>; tone: string }
> = {
  SUPER_ADMIN: { label: "Super admin", icon: ShieldCheck, tone: "bg-violet-500/15 text-violet-700 dark:text-violet-300" },
  OWNER: { label: "Owner", icon: Building2, tone: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  ADMIN: { label: "Admin", icon: ShieldCheck, tone: "bg-sky-500/15 text-sky-700 dark:text-sky-300" },
  DOCTOR: { label: "Doctor", icon: Stethoscope, tone: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
  RECEPTIONIST: { label: "Reception", icon: ClipboardList, tone: "bg-sky-500/15 text-sky-700 dark:text-sky-300" },
  NURSE: { label: "Nurse", icon: BedDouble, tone: "bg-rose-500/15 text-rose-700 dark:text-rose-300" },
  PHARMACIST: { label: "Pharmacy", icon: Pill, tone: "bg-purple-500/15 text-purple-700 dark:text-purple-300" },
  LAB_TECH: { label: "Lab tech", icon: TestTube, tone: "bg-teal-500/15 text-teal-700 dark:text-teal-300" },
};

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function firstName(full: string) {
  return full.split(" ")[0];
}

type Props = {
  title: string;
  subtitle: string;
  userName: string;
  role: Role;
  /** Optional right-aligned slot for action buttons. */
  action?: React.ReactNode;
};

export function RoleHeader({ title, subtitle, userName, role, action }: Props) {
  const meta = ROLE_META[role];
  const Icon = meta.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-wrap items-end justify-between gap-3"
    >
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${meta.tone}`}
          >
            <Icon className="h-3 w-3" />
            {meta.label}
          </span>
          <span className="text-[11px] text-muted-foreground">
            {greeting()}, {firstName(userName)}
          </span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      </div>
      {action && (
        <div className="flex flex-wrap items-center gap-2">{action}</div>
      )}
    </motion.div>
  );
}
