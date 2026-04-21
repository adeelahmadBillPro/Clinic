"use client";

import {
  LayoutDashboard,
  CircleUserRound,
  Stethoscope,
  Pill,
  FlaskConical,
  BedDouble,
  Users,
  CalendarDays,
  Calendar,
  Receipt,
  Package,
  LineChart,
  UserCog,
  Settings,
  Sparkles,
  AlertTriangle,
  HelpCircle,
  type LucideIcon,
} from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard,
  CircleUserRound,
  Stethoscope,
  Pill,
  FlaskConical,
  BedDouble,
  Users,
  CalendarDays,
  Calendar,
  Receipt,
  Package,
  LineChart,
  UserCog,
  Settings,
  Sparkles,
  AlertTriangle,
  HelpCircle,
};

export function Icon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const Component = ICON_MAP[name];
  if (!Component) return null;
  return <Component className={className} />;
}
