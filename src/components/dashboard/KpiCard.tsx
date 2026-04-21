"use client";

import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/shared/Icon";

type Props = {
  label: string;
  value: number;
  format?: "number" | "currency" | "percent";
  icon?: string;
  tone?: "default" | "success" | "warning" | "danger";
  subtle?: string;
  shakeWhenPositive?: boolean;
  currencySymbol?: string;
};

const TONE_STYLES: Record<NonNullable<Props["tone"]>, string> = {
  default: "bg-card",
  success: "bg-card ring-emerald-500/20",
  warning: "bg-card ring-amber-500/25",
  danger: "bg-card ring-destructive/30",
};

const ICON_WRAP: Record<NonNullable<Props["tone"]>, string> = {
  default: "bg-primary/10 text-primary",
  success: "bg-emerald-500/12 text-emerald-600",
  warning: "bg-amber-500/12 text-amber-600",
  danger: "bg-destructive/12 text-destructive",
};

function formatValue(v: number, format: Props["format"], currency?: string) {
  if (format === "currency") {
    return `${currency ?? "₨"} ${Math.round(v).toLocaleString()}`;
  }
  if (format === "percent") return `${Math.round(v)}%`;
  return Math.round(v).toLocaleString();
}

export function KpiCard({
  label,
  value,
  format = "number",
  icon,
  tone = "default",
  subtle,
  shakeWhenPositive,
  currencySymbol,
}: Props) {
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (v) => formatValue(v, format, currencySymbol));
  const rendered = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const controls = animate(mv, value, {
      duration: 0.9,
      ease: [0.22, 1, 0.36, 1],
    });
    return () => controls.stop();
  }, [value, mv]);

  useEffect(() => {
    return rounded.on("change", (v) => {
      if (rendered.current) rendered.current.textContent = String(v);
    });
  }, [rounded]);

  const shake = shakeWhenPositive && value > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{
        opacity: 1,
        y: 0,
        ...(shake
          ? {
              x: [0, -5, 5, -5, 5, -3, 3, 0],
              transition: {
                x: { duration: 0.55, repeat: Infinity, repeatDelay: 4.5 },
              },
            }
          : {}),
      }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "relative overflow-hidden rounded-xl p-4 ring-1 ring-border",
        TONE_STYLES[tone],
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-medium text-muted-foreground">
            {label}
          </div>
          <div className="mt-1.5 text-2xl font-semibold tabular-nums tracking-tight">
            <span ref={rendered}>{formatValue(0, format, currencySymbol)}</span>
          </div>
          {subtle && (
            <div className="mt-1 text-xs text-muted-foreground">{subtle}</div>
          )}
        </div>
        {icon && (
          <div
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
              ICON_WRAP[tone],
            )}
          >
            <Icon name={icon} className="h-4.5 w-4.5" />
          </div>
        )}
      </div>
    </motion.div>
  );
}
