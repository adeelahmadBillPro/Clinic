"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Plus, Loader2, Check, X, CalendarDays, Clock } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  PatientSearch,
  type PatientHit,
} from "@/components/patients/PatientSearch";
import { CheckInDialog } from "./CheckInDialog";
import { DatePicker } from "@/components/shared/DatePicker";
import { cn } from "@/lib/utils";

type Appt = {
  id: string;
  patientId: string | null;
  patientName: string;
  patientPhone: string;
  doctorId: string;
  appointmentDate: string;
  timeSlot: string;
  type: string;
  status:
    | "SCHEDULED"
    | "CONFIRMED"
    | "CHECKED_IN"
    | "COMPLETED"
    | "CANCELLED"
    | "NO_SHOW";
  notes: string | null;
  bookedVia: string;
};

type Doctor = { id: string; name: string; specialization: string };

const STATUS_COLOR: Record<Appt["status"], string> = {
  SCHEDULED: "bg-amber-500/10 text-amber-700 border-amber-500/25",
  CONFIRMED: "bg-sky-500/10 text-sky-700 border-sky-500/25",
  CHECKED_IN: "bg-emerald-500/10 text-emerald-700 border-emerald-500/25",
  COMPLETED: "bg-slate-500/10 text-slate-700 border-slate-500/25",
  CANCELLED: "bg-muted text-muted-foreground",
  NO_SHOW: "bg-destructive/10 text-destructive border-destructive/25",
};

type SlotInfo = {
  time: string;
  booked: boolean;
  past: boolean;
  available: boolean;
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function AppointmentsBoard({
  initial,
  doctors,
}: {
  initial: Appt[];
  doctors: Doctor[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [checkInAppt, setCheckInAppt] = useState<Appt | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [selectedPatient, setSelectedPatient] = useState<PatientHit | null>(
    null,
  );
  const [form, setForm] = useState({
    patientName: "",
    patientPhone: "",
    doctorId: doctors[0]?.id ?? "",
    appointmentDate: "",
    timeSlot: "",
    type: "FIRST_VISIT" as "FIRST_VISIT" | "FOLLOW_UP" | "CHECKUP",
    notes: "",
  });
  const [slots, setSlots] = useState<SlotInfo[]>([]);
  const [slotsOpen, setSlotsOpen] = useState(true);
  const [slotsReason, setSlotsReason] = useState<string | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);

  useEffect(() => {
    if (!form.doctorId || !form.appointmentDate) {
      setSlots([]);
      setSlotsOpen(true);
      setSlotsReason(null);
      return;
    }
    let abort = false;
    setLoadingSlots(true);
    fetch(`/api/doctors/${form.doctorId}/slots?date=${form.appointmentDate}`)
      .then((r) => r.json())
      .then((body) => {
        if (abort) return;
        if (body?.success) {
          setSlots(body.data.slots ?? []);
          setSlotsOpen(body.data.open);
          setSlotsReason(body.data.reason ?? null);
          const stillValid = (body.data.slots as SlotInfo[] | undefined)?.some(
            (s) => s.time === form.timeSlot && s.available,
          );
          if (!stillValid) setForm((f) => ({ ...f, timeSlot: "" }));
        }
      })
      .finally(() => {
        if (!abort) setLoadingSlots(false);
      });
    return () => {
      abort = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.doctorId, form.appointmentDate]);

  const byDay = useMemo(() => {
    const map = new Map<string, Appt[]>();
    for (const a of initial) {
      const key = a.appointmentDate.slice(0, 10);
      const arr = map.get(key) ?? [];
      arr.push(a);
      map.set(key, arr);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [initial]);

  async function book() {
    const name = selectedPatient?.name ?? form.patientName;
    const phone = selectedPatient?.phone ?? form.patientPhone;
    if (!name || !phone) {
      toast.error("Patient name and phone required");
      return;
    }
    if (!form.doctorId) {
      toast.error("Pick a doctor");
      return;
    }
    if (!form.appointmentDate) {
      toast.error("Pick a date");
      return;
    }
    if (!form.timeSlot) {
      toast.error("Pick a time slot");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: selectedPatient?.id,
          patientName: name,
          patientPhone: phone,
          doctorId: form.doctorId,
          appointmentDate: form.appointmentDate,
          timeSlot: form.timeSlot,
          type: form.type,
          notes: form.notes,
          bookedVia: "PHONE",
        }),
      });
      const body = await res.json();
      if (!res.ok || !body?.success) {
        toast.error(body?.error ?? "Failed");
        return;
      }
      toast.success(
        body.data?.confirmation
          ? `Booked · ${body.data.confirmation}`
          : "Appointment booked",
      );
      setOpen(false);
      setSelectedPatient(null);
      setForm({ ...form, patientName: "", patientPhone: "", notes: "" });
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function patch(
    id: string,
    payload: Record<string, unknown>,
    label: string,
  ) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/appointments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok || !body?.success) {
        toast.error(body?.error ?? "Failed");
        return;
      }
      toast.success(label);
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Book appointment
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>New appointment</DialogTitle>
            </DialogHeader>

            <div>
              <Label>Existing patient (optional)</Label>
              <div className="mt-1">
                {selectedPatient ? (
                  <div className="flex items-center justify-between rounded-md border bg-muted/30 p-2.5 text-sm">
                    <div>
                      <div className="font-medium">{selectedPatient.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {selectedPatient.mrn} · {selectedPatient.phone}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedPatient(null)}
                    >
                      Clear
                    </Button>
                  </div>
                ) : (
                  <PatientSearch onSelect={setSelectedPatient} />
                )}
              </div>
            </div>

            {!selectedPatient && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Name</Label>
                  <Input
                    value={form.patientName}
                    onChange={(e) =>
                      setForm({ ...form, patientName: e.target.value })
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input
                    value={form.patientPhone}
                    onChange={(e) =>
                      setForm({ ...form, patientPhone: e.target.value })
                    }
                    className="mt-1"
                  />
                </div>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Doctor</Label>
                <Select
                  value={form.doctorId}
                  onValueChange={(v) => v && setForm({ ...form, doctorId: v })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Pick a doctor">
                      {(() => {
                        const d = doctors.find((x) => x.id === form.doctorId);
                        return d ? `${d.name} · ${d.specialization}` : undefined;
                      })()}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {doctors.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name} · {d.specialization}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Type</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) =>
                    v && setForm({ ...form, type: v as typeof form.type })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FIRST_VISIT">First visit</SelectItem>
                    <SelectItem value="FOLLOW_UP">Follow-up</SelectItem>
                    <SelectItem value="CHECKUP">Check-up</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Date</Label>
                <div className="mt-1">
                  <DatePicker
                    value={form.appointmentDate}
                    onChange={(v) =>
                      setForm({ ...form, appointmentDate: v })
                    }
                    disablePast
                    maxAhead={14}
                    placeholder="Pick date"
                  />
                </div>
              </div>
            </div>

            <div>
              <Label className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                Available time
              </Label>
              {!form.appointmentDate ? (
                <div className="mt-1 rounded-md border border-dashed bg-muted/30 p-3 text-center text-xs text-muted-foreground">
                  Pick a date first
                </div>
              ) : loadingSlots ? (
                <div className="mt-1 flex items-center gap-2 rounded-md border bg-card p-3 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Loading slots...
                </div>
              ) : !slotsOpen ? (
                <div className="mt-1 rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-center text-xs text-amber-700">
                  {slotsReason ?? "Doctor is closed on this day."}
                </div>
              ) : slots.length === 0 ? (
                <div className="mt-1 rounded-md border border-dashed bg-muted/30 p-3 text-center text-xs text-muted-foreground">
                  Doctor has no schedule set. Ask them to configure availability
                  in <a href="/profile" className="text-primary hover:underline">My profile</a>.
                </div>
              ) : (
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {slots.map((s) => {
                    const isSelected = form.timeSlot === s.time;
                    const disabled = !s.available;
                    return (
                      <button
                        key={s.time}
                        type="button"
                        disabled={disabled}
                        onClick={() => setForm({ ...form, timeSlot: s.time })}
                        title={
                          s.past
                            ? "Time has passed"
                            : s.booked
                              ? "Already booked"
                              : undefined
                        }
                        className={cn(
                          "rounded-full border px-2.5 py-1 text-[11px] font-medium transition",
                          isSelected &&
                            "border-primary bg-primary text-primary-foreground shadow-sm",
                          !isSelected && s.available && "bg-card hover:bg-accent/60",
                          s.booked && !isSelected && "border-dashed bg-muted text-muted-foreground line-through",
                          s.past && !isSelected && "bg-muted/40 text-muted-foreground/50",
                        )}
                      >
                        {s.time}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <Label>Notes</Label>
              <Input
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="mt-1"
              />
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button variant="ghost">Cancel</Button>
              </DialogClose>
              <Button onClick={book} disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Booking
                  </>
                ) : (
                  "Book"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {byDay.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          No upcoming appointments.
        </div>
      ) : (
        <div className="space-y-5">
          {byDay.map(([day, list]) => {
            const doctorById = new Map(doctors.map((d) => [d.id, d]));
            return (
              <section key={day}>
                <div className="mb-2 flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  <h2 className="text-sm font-semibold">
                    {fmtDate(day + "T00:00:00")}
                  </h2>
                  <span className="text-xs text-muted-foreground">
                    · {list.length}
                  </span>
                </div>
                <motion.ul
                  initial="initial"
                  animate="animate"
                  variants={{
                    animate: { transition: { staggerChildren: 0.02 } },
                  }}
                  className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3"
                >
                  {list.map((a) => (
                    <motion.li
                      key={a.id}
                      variants={{
                        initial: { opacity: 0, y: 6 },
                        animate: { opacity: 1, y: 0 },
                      }}
                      className={cn(
                        "rounded-xl border bg-card p-4",
                        STATUS_COLOR[a.status],
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-xs font-mono font-semibold">
                            {a.timeSlot}
                          </div>
                          <div className="mt-0.5 truncate font-medium">
                            {a.patientName}
                          </div>
                          <div className="truncate text-xs text-muted-foreground">
                            {a.patientPhone}
                          </div>
                          <div className="mt-1 truncate text-xs">
                            {doctorById.get(a.doctorId)?.name ?? "Doctor"}
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-[10px]">
                          {a.status.replace("_", " ")}
                        </Badge>
                      </div>
                      {a.bookedVia === "ONLINE" && (
                        <Badge
                          variant="secondary"
                          className="mt-2 text-[10px]"
                        >
                          online booking
                        </Badge>
                      )}
                      {(a.status === "SCHEDULED" ||
                        a.status === "CONFIRMED") && (
                        <div className="mt-2 flex gap-1.5">
                          <Button
                            size="xs"
                            variant="outline"
                            onClick={() => {
                              if (a.patientId) {
                                patch(
                                  a.id,
                                  { checkIn: true },
                                  "Checked in — token created",
                                );
                              } else {
                                setCheckInAppt(a);
                              }
                            }}
                            disabled={busyId === a.id}
                          >
                            <Check className="mr-1 h-3 w-3" />
                            Check in
                          </Button>
                          <Button
                            size="xs"
                            variant="ghost"
                            onClick={() =>
                              patch(
                                a.id,
                                { status: "CANCELLED" },
                                "Appointment cancelled",
                              )
                            }
                            disabled={busyId === a.id}
                          >
                            <X className="mr-1 h-3 w-3" />
                            Cancel
                          </Button>
                        </div>
                      )}
                    </motion.li>
                  ))}
                </motion.ul>
              </section>
            );
          })}
        </div>
      )}

      {checkInAppt && (
        <CheckInDialog
          appointment={{
            id: checkInAppt.id,
            patientName: checkInAppt.patientName,
            patientPhone: checkInAppt.patientPhone,
            timeSlot: checkInAppt.timeSlot,
            patientId: checkInAppt.patientId,
          }}
          onClose={() => setCheckInAppt(null)}
          onCheckedIn={() => {
            setCheckInAppt(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
