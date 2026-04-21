"use client";

import { useState, useEffect } from "react";
import { CalendarDays, X } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

type Props = {
  value?: string; // ISO yyyy-MM-dd
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  fromYear?: number;
  toYear?: number;
  fromDate?: Date;
  toDate?: Date;
  /** Disable past dates (today is still allowed). */
  disablePast?: boolean;
  /** Disable future dates (today is still allowed). */
  disableFuture?: boolean;
  className?: string;
  id?: string;
  clearable?: boolean;
};

function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fromISO(v?: string): Date | undefined {
  if (!v) return undefined;
  const d = new Date(v);
  return isNaN(d.getTime()) ? undefined : d;
}

function prettyDate(d: Date): string {
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  disabled,
  fromYear,
  toYear,
  fromDate,
  toDate,
  disablePast,
  disableFuture,
  className,
  id,
  clearable = true,
}: Props) {
  const [open, setOpen] = useState(false);
  const selected = fromISO(value);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const effectiveFromDate = disablePast ? today : fromDate;
  const effectiveToDate = disableFuture ? today : toDate;

  // Close popover after picking
  function onSelect(d: Date | undefined) {
    if (!d) return;
    onChange?.(toISO(d));
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        id={id}
        disabled={disabled}
        className={cn(
          "inline-flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-input bg-transparent px-3 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 hover:bg-accent/40",
          !selected && "text-muted-foreground",
          className,
        )}
      >
        <span className="flex items-center gap-2">
          <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
          {selected ? prettyDate(selected) : placeholder}
        </span>
        {clearable && selected && (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              onChange?.("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                onChange?.("");
              }
            }}
            aria-label="Clear date"
            className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={onSelect}
          defaultMonth={selected ?? new Date()}
          captionLayout={fromYear || toYear ? "dropdown" : undefined}
          startMonth={
            effectiveFromDate
              ? new Date(effectiveFromDate.getFullYear(), effectiveFromDate.getMonth())
              : fromYear
                ? new Date(fromYear, 0)
                : undefined
          }
          endMonth={
            effectiveToDate
              ? new Date(effectiveToDate.getFullYear(), effectiveToDate.getMonth())
              : toYear
                ? new Date(toYear, 11)
                : undefined
          }
          disabled={
            [
              effectiveFromDate ? { before: effectiveFromDate } : null,
              effectiveToDate ? { after: effectiveToDate } : null,
            ].filter(Boolean) as unknown as Parameters<
              typeof Calendar
            >[0]["disabled"]
          }
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );
}
