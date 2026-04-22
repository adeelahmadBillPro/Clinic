"use client";

import { useState } from "react";
import { CalendarClock, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
type DaySlot = { start: string; end: string } | null;
export type WeeklySchedule = Record<DayKey, DaySlot>;

const DAYS: Array<{ key: DayKey; label: string }> = [
  { key: "mon", label: "Monday" },
  { key: "tue", label: "Tuesday" },
  { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" },
  { key: "fri", label: "Friday" },
  { key: "sat", label: "Saturday" },
  { key: "sun", label: "Sunday" },
];

export function ScheduleEditor({
  initial,
}: {
  initial: WeeklySchedule;
}) {
  const [schedule, setSchedule] = useState<WeeklySchedule>(initial);
  const [slotMinutes, setSlotMinutes] = useState<number>(30);
  const [saving, setSaving] = useState(false);

  function toggleDay(key: DayKey) {
    setSchedule((prev) => ({
      ...prev,
      [key]: prev[key] ? null : { start: "09:00", end: "17:00" },
    }));
  }

  function setTime(key: DayKey, field: "start" | "end", value: string) {
    setSchedule((prev) => {
      const current = prev[key] ?? { start: "09:00", end: "17:00" };
      return { ...prev, [key]: { ...current, [field]: value } };
    });
  }

  function copyMonToAll() {
    const mon = schedule.mon;
    if (!mon) {
      toast.error("Set Monday's hours first");
      return;
    }
    setSchedule({
      mon,
      tue: mon,
      wed: mon,
      thu: mon,
      fri: mon,
      sat: mon,
      sun: mon,
    });
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/profile/schedule", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schedule, slotMinutes }),
      });
      const body = await res.json();
      if (!res.ok || !body?.success) {
        toast.error(body?.error ?? "Could not save schedule");
        return;
      }
      toast.success("Availability saved");
    } finally {
      setSaving(false);
    }
  }

  const activeCount = DAYS.filter((d) => !!schedule[d.key]).length;

  return (
    <section className="card-surface p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Weekly availability</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={copyMonToAll}
            className="rounded-full border bg-card px-3 py-1 text-[11px] font-medium hover:bg-accent/60"
          >
            Copy Mon → all
          </button>
        </div>
      </div>

      <p className="mb-4 text-xs text-muted-foreground">
        Patients can only book appointments during these hours. Each booked
        slot is {slotMinutes} minutes long.
      </p>

      <div className="space-y-2">
        {DAYS.map((d) => {
          const slot = schedule[d.key];
          const on = !!slot;
          return (
            <div
              key={d.key}
              className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-3"
            >
              <label className="flex cursor-pointer items-center gap-2 min-w-28">
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => toggleDay(d.key)}
                  className="h-4 w-4 cursor-pointer accent-primary"
                />
                <span className="text-sm font-medium">{d.label}</span>
              </label>
              {on ? (
                <div className="flex flex-1 items-center gap-2">
                  <Input
                    type="time"
                    value={slot!.start}
                    onChange={(e) => setTime(d.key, "start", e.target.value)}
                    className="w-28"
                  />
                  <span className="text-xs text-muted-foreground">to</span>
                  <Input
                    type="time"
                    value={slot!.end}
                    onChange={(e) => setTime(d.key, "end", e.target.value)}
                    className="w-28"
                  />
                </div>
              ) : (
                <span className="text-xs text-muted-foreground">Closed</span>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <Label className="text-xs">Slot length (minutes)</Label>
          <div className="mt-1 flex gap-1">
            {[15, 20, 30, 45, 60].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setSlotMinutes(m)}
                className={`flex-1 rounded-md border px-2 py-1.5 text-xs font-medium transition ${
                  slotMinutes === m
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-card hover:bg-accent/40"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
        <div className="self-end text-xs text-muted-foreground">
          {activeCount} day{activeCount === 1 ? "" : "s"} open / week
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <Button onClick={save} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              Saving
            </>
          ) : (
            <>
              <Check className="mr-1.5 h-4 w-4" />
              Save availability
            </>
          )}
        </Button>
      </div>
    </section>
  );
}
