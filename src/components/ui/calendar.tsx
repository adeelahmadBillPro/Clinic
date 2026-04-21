"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, getDefaultClassNames } from "react-day-picker";

import { cn } from "@/lib/utils";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

export function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  const defaults = getDefaultClassNames();

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        ...defaults,
        root: cn("rdp-root text-sm", defaults.root),
        months: cn("flex flex-col gap-3", defaults.months),
        month: cn("space-y-3", defaults.month),
        month_caption: cn(
          "flex justify-center items-center relative h-9 px-1",
          defaults.month_caption,
        ),
        caption_label: cn(
          "text-sm font-semibold tracking-tight",
          defaults.caption_label,
        ),
        nav: cn(
          "absolute inset-x-1 top-0 flex items-center justify-between",
          defaults.nav,
        ),
        button_previous: cn(
          "inline-flex h-7 w-7 items-center justify-center rounded-md border border-transparent text-muted-foreground transition hover:bg-accent hover:text-foreground disabled:opacity-30",
          defaults.button_previous,
        ),
        button_next: cn(
          "inline-flex h-7 w-7 items-center justify-center rounded-md border border-transparent text-muted-foreground transition hover:bg-accent hover:text-foreground disabled:opacity-30",
          defaults.button_next,
        ),
        month_grid: cn("w-full border-collapse space-y-1", defaults.month_grid),
        weekdays: cn("flex", defaults.weekdays),
        weekday: cn(
          "flex-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground",
          defaults.weekday,
        ),
        week: cn("mt-1 flex w-full", defaults.week),
        day: cn("flex-1 text-center p-0", defaults.day),
        day_button: cn(
          "relative mx-auto inline-flex h-8 w-8 items-center justify-center rounded-md text-sm transition hover:bg-accent hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
          defaults.day_button,
        ),
        today: cn(
          "font-bold text-primary before:absolute before:inset-0 before:rounded-md before:ring-1 before:ring-primary/40",
          defaults.today,
        ),
        selected: cn(
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground [&_button]:bg-primary [&_button]:text-primary-foreground [&_button]:hover:bg-primary",
          defaults.selected,
        ),
        outside: cn("text-muted-foreground/40", defaults.outside),
        disabled: cn("text-muted-foreground/30", defaults.disabled),
        hidden: cn("invisible", defaults.hidden),
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className: cl, ...rest }) =>
          orientation === "left" ? (
            <ChevronLeft className={cn("h-4 w-4", cl)} {...rest} />
          ) : (
            <ChevronRight className={cn("h-4 w-4", cl)} {...rest} />
          ),
      }}
      {...props}
    />
  );
}
