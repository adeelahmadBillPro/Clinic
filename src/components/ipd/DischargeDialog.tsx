"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2 } from "lucide-react";
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

type Bed = {
  id: string;
  bedNumber: string;
  wardName: string;
  bedType: string;
  dailyRate: number;
  currentPatient: { id: string; name: string; mrn: string } | null;
};

export function DischargeDialog({
  bed,
  onClose,
  onDone,
}: {
  bed: Bed;
  onClose: () => void;
  onDone: () => void;
}) {
  const router = useRouter();
  const [admissionId, setAdmissionId] = useState<string | null>(null);
  const [diagnosis, setDiagnosis] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/ipd/admissions?status=ADMITTED");
      const body = await res.json();
      if (body?.success) {
        const match = body.data.find(
          (a: { bed: { id: string } | null }) => a.bed?.id === bed.id,
        );
        setAdmissionId(match?.id ?? null);
      }
    })();
  }, [bed.id]);

  async function discharge() {
    if (!admissionId) {
      toast.error("No active admission found for this bed");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/ipd/admissions/${admissionId}/discharge`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dischargeDiagnosis: diagnosis || undefined,
            dischargeNotes: notes || undefined,
          }),
        },
      );
      const body = await res.json();
      if (!res.ok || !body?.success) {
        toast.error(body?.error ?? "Discharge failed");
        return;
      }
      toast.success(
        `Discharged · ${body.data.days} ${body.data.days === 1 ? "day" : "days"} stay, ₨ ${Math.round(body.data.total).toLocaleString()} total`,
      );
      onDone();
      router.push(`/billing/${body.data.billId}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            Discharge {bed.currentPatient?.name}
          </DialogTitle>
        </DialogHeader>

        <div className="rounded-lg border bg-muted/30 p-3 text-sm">
          <div>
            Bed {bed.bedNumber} · {bed.wardName}
          </div>
          <div className="text-xs text-muted-foreground">
            Daily rate ₨ {Math.round(bed.dailyRate).toLocaleString()}
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <Label>Discharge diagnosis</Label>
            <Textarea
              rows={2}
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              className="mt-1 resize-none"
              placeholder="Final clinical impression"
            />
          </div>
          <div>
            <Label>Notes / follow-up instructions</Label>
            <Textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 resize-none"
              placeholder="Medications at home, follow-up schedule..."
            />
          </div>
        </div>

        <div className="rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 p-3 text-xs text-muted-foreground">
          On discharge: bill is auto-generated from bed charges × days + linked
          pharmacy orders + lab orders. You&rsquo;ll be taken to the bill to
          collect payment.
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost" disabled={submitting}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            onClick={discharge}
            disabled={submitting || !admissionId}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Discharging
              </>
            ) : (
              "Discharge & generate bill"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
