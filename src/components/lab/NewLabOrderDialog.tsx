"use client";

import { useEffect, useState } from "react";
import { Loader2, FlaskConical } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PatientSearch,
  type PatientHit,
} from "@/components/patients/PatientSearch";
import { LAB_CATALOG } from "@/lib/labCatalog";
import { cn } from "@/lib/utils";

export function NewLabOrderDialog({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: () => void;
}) {
  const [patient, setPatient] = useState<PatientHit | null>(null);
  const [doctors, setDoctors] = useState<
    Array<{ id: string; name: string; specialization: string }>
  >([]);
  const [doctorId, setDoctorId] = useState<string>("");
  const [selected, setSelected] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/doctors")
      .then((r) => r.json())
      .then((b) => {
        if (b?.success) {
          setDoctors(b.data);
          if (b.data[0]) setDoctorId(b.data[0].id);
        }
      });
  }, []);

  const total = selected.reduce((s, code) => {
    const t = LAB_CATALOG.find((x) => x.code === code);
    return s + (t?.price ?? 0);
  }, 0);

  async function save() {
    if (!patient) {
      toast.error("Pick a patient");
      return;
    }
    if (!doctorId) {
      toast.error("Pick an ordering doctor");
      return;
    }
    if (selected.length === 0) {
      toast.error("Select at least one test");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/lab/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: patient.id,
          doctorId,
          testCodes: selected,
        }),
      });
      const body = await res.json();
      if (!res.ok || !body?.success) {
        toast.error(body?.error ?? "Failed");
        return;
      }
      toast.success(`Ordered — ${body.data.orderNumber}`);
      onDone();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-primary" />
            New lab order
          </DialogTitle>
        </DialogHeader>

        <div>
          <Label>Patient</Label>
          {patient ? (
            <div className="mt-1 flex items-center justify-between rounded-md border bg-muted/30 p-2.5 text-sm">
              <div>
                <div className="font-medium">{patient.name}</div>
                <div className="text-xs text-muted-foreground">
                  {patient.mrn} · {patient.phone}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPatient(null)}
              >
                Change
              </Button>
            </div>
          ) : (
            <div className="mt-1">
              <PatientSearch onSelect={setPatient} />
            </div>
          )}
        </div>

        <div>
          <Label>Ordering doctor</Label>
          <Select value={doctorId} onValueChange={(v) => v && setDoctorId(v)}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Pick a doctor">
                {(() => {
                  const d = doctors.find((x) => x.id === doctorId);
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
          <Label>Tests</Label>
          <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
            {LAB_CATALOG.map((t) => {
              const checked = selected.includes(t.code);
              return (
                <button
                  key={t.code}
                  type="button"
                  onClick={() =>
                    setSelected((prev) =>
                      checked
                        ? prev.filter((c) => c !== t.code)
                        : [...prev, t.code],
                    )
                  }
                  className={cn(
                    "rounded-lg border p-3 text-left transition",
                    checked
                      ? "border-primary/50 bg-primary/5"
                      : "hover:border-primary/30",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-semibold text-primary">
                      {t.code}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ₨ {t.price}
                    </span>
                  </div>
                  <div className="mt-1 text-sm font-medium">{t.name}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {t.sampleType}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2">
          <span className="text-sm text-muted-foreground">Total</span>
          <span className="text-lg font-semibold tabular-nums">
            ₨ {Math.round(total).toLocaleString()}
          </span>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost" disabled={submitting}>
              Cancel
            </Button>
          </DialogClose>
          <Button onClick={save} disabled={submitting || !patient || selected.length === 0}>
            {submitting ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Saving
              </>
            ) : (
              "Create order"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
