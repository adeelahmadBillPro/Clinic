"use client";

import { useEffect, useState } from "react";
import { Loader2, UserCog, ArrowRight } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Doctor = {
  id: string;
  name: string;
  specialization: string;
  roomNumber: string | null;
  status: string;
  isAvailable: boolean;
  waitingCount: number;
};

export function ReferDialog({
  tokenId,
  currentDoctorId,
  patientName,
  onClose,
  onReferred,
}: {
  tokenId: string;
  currentDoctorId: string;
  patientName: string;
  onClose: () => void;
  onReferred: (displayToken: string) => void;
}) {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [toDoctorId, setToDoctorId] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/doctors");
      const body = await res.json();
      if (body?.success) {
        const others = (body.data as Doctor[]).filter(
          (d) =>
            d.id !== currentDoctorId &&
            d.isAvailable &&
            d.status !== "OFF_DUTY",
        );
        setDoctors(others);
        if (others[0]) setToDoctorId(others[0].id);
      }
      setLoading(false);
    })();
  }, [currentDoctorId]);

  async function refer() {
    if (!toDoctorId) {
      toast.error("Pick a doctor to refer to");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/tokens/${tokenId}/refer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toDoctorId, notes }),
      });
      const body = await res.json();
      if (!res.ok || !body?.success) {
        toast.error(body?.error ?? "Referral failed");
        return;
      }
      toast.success(
        `Referred — ${body.data.displayToken} added to ${doctors.find((d) => d.id === toDoctorId)?.name}'s queue`,
      );
      onReferred(body.data.displayToken);
    } finally {
      setSubmitting(false);
    }
  }

  const selectedDoctor = doctors.find((d) => d.id === toDoctorId);

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCog className="h-4 w-4 text-primary" />
            Refer {patientName} to another doctor
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading available doctors...
          </div>
        ) : doctors.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            No other doctors are on duty right now.
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <Label>Refer to</Label>
              <Select
                value={toDoctorId}
                onValueChange={(v) => v && setToDoctorId(v)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Pick a doctor">
                    {selectedDoctor
                      ? `${selectedDoctor.name} · ${selectedDoctor.specialization}`
                      : undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {doctors.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      <div className="flex w-full items-center justify-between gap-2">
                        <span>
                          {d.name}{" "}
                          <span className="text-muted-foreground">
                            · {d.specialization}
                          </span>
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {d.waitingCount} waiting
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Referral note (optional)</Label>
              <Textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-1 resize-none"
                placeholder="Reason for referral, findings so far..."
              />
            </div>

            <div className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5 font-medium text-foreground">
                <ArrowRight className="h-3 w-3" />
                What happens next
              </div>
              <ul className="mt-1.5 list-inside list-disc space-y-0.5">
                <li>This consultation is marked complete.</li>
                <li>
                  A new token is created in{" "}
                  <span className="font-medium text-foreground">
                    {selectedDoctor?.name ?? "the target doctor"}
                  </span>
                  &rsquo;s queue with a &ldquo;Referred from&rdquo; tag.
                </li>
                <li>The receiving doctor gets a notification.</li>
              </ul>
            </div>
          </div>
        )}

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost" disabled={submitting}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            onClick={refer}
            disabled={submitting || doctors.length === 0 || !toDoctorId}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Referring
              </>
            ) : (
              <>
                <ArrowRight className="mr-1.5 h-3.5 w-3.5" />
                Refer &amp; close this consultation
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
