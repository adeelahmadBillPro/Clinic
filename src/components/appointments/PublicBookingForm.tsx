"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, CheckCircle2, Stethoscope } from "lucide-react";
import { toast } from "sonner";

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
import { DatePicker } from "@/components/shared/DatePicker";
import { cn } from "@/lib/utils";

type Doctor = {
  id: string;
  name: string;
  specialization: string;
  qualification: string;
  consultationFee: number;
};

const TIME_SLOTS = [
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
  "17:30",
  "18:00",
  "18:30",
  "19:00",
];

export function PublicBookingForm({
  slug,
  doctors,
}: {
  slug: string;
  doctors: Doctor[];
}) {
  const [form, setForm] = useState({
    patientName: "",
    patientPhone: "",
    doctorId: doctors[0]?.id ?? "",
    appointmentDate: "",
    timeSlot: "10:00",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState<string | null>(null);

  const doctor = doctors.find((d) => d.id === form.doctorId);

  async function submit() {
    if (!form.patientName.trim() || !form.patientPhone.trim()) {
      toast.error("Please fill your name and phone");
      return;
    }
    if (!form.appointmentDate) {
      toast.error("Pick a date");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/book/${slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const body = await res.json();
      if (!res.ok || !body?.success) {
        toast.error(body?.error ?? "Could not book");
        return;
      }
      setConfirmation(body.data.confirmation);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-2xl border bg-card p-6 auth-card-shadow">
      <AnimatePresence mode="wait">
        {confirmation ? (
          <motion.div
            key="done"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-3 py-6 text-center"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <h2 className="text-xl font-semibold">Appointment confirmed</h2>
            <p className="text-sm text-muted-foreground">
              Confirmation code:{" "}
              <span className="font-mono font-bold text-foreground">
                {confirmation}
              </span>
            </p>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              We&rsquo;ll contact you on the phone you provided to confirm the
              exact time and any preparation instructions.
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div>
              <Label>Doctor</Label>
              <Select
                value={form.doctorId}
                onValueChange={(v) => v && setForm({ ...form, doctorId: v })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select a doctor">
                    {doctor
                      ? `${doctor.name} · ${doctor.specialization}`
                      : undefined}
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
              {doctor && (
                <div className="mt-2 flex items-center gap-2 rounded-md bg-muted/40 px-3 py-2 text-xs">
                  <Stethoscope className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{doctor.qualification}</span>
                  <span className="ml-auto font-medium">
                    Fee ₨ {Math.round(doctor.consultationFee).toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Your name</Label>
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
                  type="tel"
                  value={form.patientPhone}
                  onChange={(e) =>
                    setForm({ ...form, patientPhone: e.target.value })
                  }
                  className="mt-1"
                  placeholder="0300-1234567"
                />
              </div>
              <div>
                <Label>Preferred date</Label>
                <div className="mt-1">
                  <DatePicker
                    value={form.appointmentDate}
                    onChange={(v) =>
                      setForm({ ...form, appointmentDate: v })
                    }
                    disablePast
                    placeholder="Pick a date"
                  />
                </div>
              </div>
              <div>
                <Label>Preferred time</Label>
                <Select
                  value={form.timeSlot}
                  onValueChange={(v) => v && setForm({ ...form, timeSlot: v })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_SLOTS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Notes (optional)</Label>
              <Input
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="mt-1"
                placeholder="Reason for visit, prior conditions..."
              />
            </div>

            <Button
              size="lg"
              className={cn("w-full h-11")}
              onClick={submit}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  Booking...
                </>
              ) : (
                "Book appointment"
              )}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
