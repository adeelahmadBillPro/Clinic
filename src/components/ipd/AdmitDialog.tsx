"use client";

import { useEffect, useState } from "react";
import { Loader2, BedDouble } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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

type Bed = {
  id: string;
  bedNumber: string;
  wardName: string;
  bedType: string;
  dailyRate: number;
};

type Doctor = { id: string; name: string; specialization: string };

export function AdmitDialog({
  bed,
  onClose,
  onDone,
}: {
  bed: Bed;
  onClose: () => void;
  onDone: () => void;
}) {
  const [patient, setPatient] = useState<PatientHit | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [doctorId, setDoctorId] = useState<string>("");
  const [diagnosis, setDiagnosis] = useState("");
  const [notes, setNotes] = useState("");
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

  async function admit() {
    if (!patient) {
      toast.error("Pick a patient");
      return;
    }
    if (!doctorId) {
      toast.error("Pick an attending doctor");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/ipd/admissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: patient.id,
          bedId: bed.id,
          doctorId,
          admissionDiagnosis: diagnosis || undefined,
          admissionNotes: notes || undefined,
        }),
      });
      const body = await res.json();
      if (!res.ok || !body?.success) {
        toast.error(body?.error ?? "Failed");
        return;
      }
      toast.success(`Admitted — ${body.data.admissionNumber}`);
      onDone();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BedDouble className="h-4 w-4 text-primary" />
            Admit to {bed.bedNumber}
          </DialogTitle>
        </DialogHeader>

        <div className="rounded-lg border bg-muted/30 p-3 text-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">{bed.wardName}</div>
              <div className="text-xs text-muted-foreground">
                Bed {bed.bedNumber} · {bed.bedType.replace("_", " ")}
              </div>
            </div>
            <Badge variant="secondary">
              ₨ {Math.round(bed.dailyRate).toLocaleString()}/day
            </Badge>
          </div>
        </div>

        <div className="space-y-3">
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
            <Label>Attending doctor</Label>
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
            <Label>Admission diagnosis</Label>
            <Textarea
              rows={2}
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              className="mt-1 resize-none"
              placeholder="Pneumonia, dehydration, RTA..."
            />
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost" disabled={submitting}>
              Cancel
            </Button>
          </DialogClose>
          <Button onClick={admit} disabled={submitting || !patient}>
            {submitting ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Admitting
              </>
            ) : (
              "Admit patient"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
