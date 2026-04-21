"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2, UserPlus, Search } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  PatientSearch,
  type PatientHit,
} from "@/components/patients/PatientSearch";
import { cn } from "@/lib/utils";

type Appt = {
  id: string;
  patientName: string;
  patientPhone: string;
  timeSlot: string;
  patientId: string | null;
};

type Mode = "CHOOSE" | "EXISTING" | "NEW";

export function CheckInDialog({
  appointment,
  onClose,
  onCheckedIn,
}: {
  appointment: Appt;
  onClose: () => void;
  onCheckedIn: (displayToken: string) => void;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("CHOOSE");
  const [selected, setSelected] = useState<PatientHit | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: appointment.patientName,
    phone: appointment.patientPhone,
    gender: "M" as "M" | "F" | "Other",
    dob: "",
    bloodGroup: "",
  });

  async function checkIn() {
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = { checkIn: true };
      if (mode === "EXISTING" && selected) {
        payload.linkExistingPatientId = selected.id;
      } else if (mode === "NEW") {
        payload.createPatient = {
          name: form.name,
          phone: form.phone,
          gender: form.gender,
          dob: form.dob || undefined,
          bloodGroup: form.bloodGroup || undefined,
        };
      }
      const res = await fetch(`/api/appointments/${appointment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body?.success) {
        toast.error(body?.error ?? "Check-in failed");
        return;
      }
      toast.success(`Checked in · ${body.data.displayToken}`);
      onCheckedIn(body.data.displayToken);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            Check in · {appointment.patientName}
          </DialogTitle>
        </DialogHeader>

        <div className="rounded-lg border bg-muted/40 p-3 text-sm">
          <div className="font-medium">{appointment.patientName}</div>
          <div className="text-xs text-muted-foreground">
            {appointment.patientPhone} · appointment at {appointment.timeSlot}
          </div>
          {!appointment.patientId && (
            <div className="mt-2 text-[11px] text-amber-700">
              This appointment isn&rsquo;t linked to a patient record yet. Pick
              one or register now.
            </div>
          )}
        </div>

        {mode === "CHOOSE" && (
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              onClick={() => setMode("EXISTING")}
              className="flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition hover:border-primary/40 hover:bg-accent"
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Search className="h-4 w-4" />
              </span>
              <span className="font-medium">Existing patient</span>
              <span className="text-xs text-muted-foreground">
                Search by name, phone, or MRN
              </span>
            </button>
            <button
              onClick={() => setMode("NEW")}
              className="flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition hover:border-primary/40 hover:bg-accent"
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                <UserPlus className="h-4 w-4" />
              </span>
              <span className="font-medium">Register new</span>
              <span className="text-xs text-muted-foreground">
                Auto-fill from appointment details
              </span>
            </button>
          </div>
        )}

        {mode === "EXISTING" && (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => {
                setMode("CHOOSE");
                setSelected(null);
              }}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              ← Change approach
            </button>
            {selected ? (
              <div className="flex items-center justify-between rounded-md border bg-muted/30 p-3">
                <div>
                  <div className="font-medium">{selected.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {selected.mrn} · {selected.phone}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelected(null)}
                >
                  Change
                </Button>
              </div>
            ) : (
              <PatientSearch
                onSelect={setSelected}
                placeholder="Search clinic patients..."
                autoFocus
              />
            )}
          </div>
        )}

        {mode === "NEW" && (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setMode("CHOOSE")}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              ← Change approach
            </button>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Gender</Label>
                <RadioGroup
                  value={form.gender}
                  onValueChange={(v) =>
                    v && setForm({ ...form, gender: v as typeof form.gender })
                  }
                  className="mt-1 flex gap-1 rounded-md bg-muted p-1"
                >
                  {(["M", "F", "Other"] as const).map((g) => (
                    <label
                      key={g}
                      className={cn(
                        "flex-1 cursor-pointer rounded px-3 py-1.5 text-center text-xs font-medium",
                        form.gender === g
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground",
                      )}
                    >
                      <RadioGroupItem value={g} className="sr-only" />
                      {g === "M" ? "Male" : g === "F" ? "Female" : "Other"}
                    </label>
                  ))}
                </RadioGroup>
              </div>
              <div>
                <Label>Date of birth</Label>
                <Input
                  type="date"
                  value={form.dob}
                  onChange={(e) => setForm({ ...form, dob: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              A new MRN will be auto-generated. You can edit full patient
              details later from the patient page.
            </p>
          </div>
        )}

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost" disabled={submitting}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            onClick={checkIn}
            disabled={
              submitting ||
              mode === "CHOOSE" ||
              (mode === "EXISTING" && !selected) ||
              (mode === "NEW" && (!form.name.trim() || !form.phone.trim()))
            }
          >
            {submitting ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Checking in
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                Check in & issue token
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
