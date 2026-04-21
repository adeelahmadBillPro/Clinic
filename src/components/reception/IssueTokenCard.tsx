"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { X, Loader2, Receipt, Zap } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AllergyBanner } from "@/components/shared/AllergyBanner";
import { TokenSlipDialog } from "./TokenSlipDialog";
import { cn } from "@/lib/utils";

type Doctor = {
  id: string;
  name: string;
  specialization: string;
  roomNumber: string | null;
  consultationFee: number;
  status: string;
  isAvailable: boolean;
  waitingCount: number;
};

type Props = {
  patient: {
    id: string;
    name: string;
    mrn: string;
    phone: string;
    allergies?: string[];
  };
  doctors: Doctor[];
  onClear: () => void;
  onIssued?: () => void;
};

type Slip = {
  displayToken: string;
  clinicName?: string;
  patientName: string;
  patientPhone: string;
  doctorName: string;
  issuedAt: string;
  expiresAt: string;
};

export function IssueTokenCard({
  patient,
  doctors,
  onClear,
  onIssued,
}: Props) {
  const [doctorId, setDoctorId] = useState<string>(
    doctors.find((d) => d.isAvailable)?.id ?? doctors[0]?.id ?? "",
  );
  const [visitType, setVisitType] = useState<"OPD" | "EMERGENCY">("OPD");
  const [complaint, setComplaint] = useState("");
  const [paymentMethod, setPaymentMethod] =
    useState<"CASH" | "CARD" | "ONLINE" | "INSURANCE" | "PANEL">("CASH");
  const [feePaid, setFeePaid] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feeOverride, setFeeOverride] = useState<string>("");
  const [slip, setSlip] = useState<Slip | null>(null);

  const doctor = doctors.find((d) => d.id === doctorId);
  const fee = feeOverride !== "" ? Number(feeOverride) : doctor?.consultationFee ?? 0;

  async function issue() {
    if (!doctorId) {
      toast.error("Pick a doctor");
      return;
    }
    if (!complaint.trim() || complaint.trim().length < 2) {
      toast.error("Enter a chief complaint");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: patient.id,
          doctorId,
          type: visitType,
          chiefComplaint: complaint.trim(),
          feeAmount: fee,
          paymentMethod,
          feePaid,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body?.success) {
        toast.error(body?.error ?? "Could not issue token");
        return;
      }

      toast.success(`Token ${body.data.displayToken} issued`);
      setSlip({
        displayToken: body.data.displayToken,
        patientName: patient.name,
        patientPhone: patient.phone,
        doctorName: doctor?.name ?? "Doctor",
        issuedAt: new Date().toISOString(),
        expiresAt: body.data.expiresAt,
      });
      onIssued?.();
      setComplaint("");
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <motion.div
        layout
        className="rounded-xl border bg-card p-5"
      >
        <div className="mb-3 flex items-start justify-between">
          <div>
            <div className="text-sm font-semibold">2. Issue token</div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              New visit for{" "}
              <span className="font-medium text-foreground">
                {patient.name}
              </span>{" "}
              · {patient.mrn}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={onClear}
            aria-label="Clear patient"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>

        {patient.allergies && patient.allergies.length > 0 && (
          <div className="mb-3">
            <AllergyBanner allergies={patient.allergies} />
          </div>
        )}

        <div className="space-y-3">
          <div>
            <Label>Doctor</Label>
            <Select value={doctorId} onValueChange={(v) => v && setDoctorId(v)}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Pick a doctor">
                  {doctor ? `${doctor.name} · ${doctor.specialization}` : undefined}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {doctors.map((d) => {
                  const disabled =
                    !d.isAvailable || d.status === "OFF_DUTY";
                  return (
                    <SelectItem key={d.id} value={d.id} disabled={disabled}>
                      <div className="flex w-full items-center justify-between gap-2">
                        <span>
                          {d.name}{" "}
                          <span className="text-muted-foreground">
                            · {d.specialization}
                          </span>
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {disabled
                            ? d.status === "OFF_DUTY"
                              ? "Off duty"
                              : "Busy"
                            : `${d.waitingCount} waiting`}
                        </span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {doctor && doctor.status !== "AVAILABLE" && (
              <p className="mt-1 text-xs text-amber-600">
                {doctor.status === "ON_BREAK"
                  ? "Doctor is on break — token will enter the queue."
                  : doctor.status === "BUSY"
                    ? "Doctor is busy — token will enter the queue."
                    : ""}
              </p>
            )}
          </div>

          <div>
            <Label>Visit type</Label>
            <RadioGroup
              value={visitType}
              onValueChange={(v) => setVisitType(v as "OPD" | "EMERGENCY")}
              className="mt-1.5 flex gap-1 rounded-md bg-muted p-1"
            >
              {(
                [
                  { v: "OPD" as const, label: "OPD" },
                  { v: "EMERGENCY" as const, label: "Emergency" },
                ]
              ).map((o) => (
                <label
                  key={o.v}
                  className={cn(
                    "flex flex-1 cursor-pointer items-center justify-center gap-1 rounded px-3 py-1.5 text-xs font-medium",
                    visitType === o.v
                      ? o.v === "EMERGENCY"
                        ? "bg-destructive text-destructive-foreground shadow-sm"
                        : "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground",
                  )}
                >
                  <RadioGroupItem value={o.v} className="sr-only" />
                  {o.v === "EMERGENCY" && <Zap className="h-3 w-3" />}
                  {o.label}
                </label>
              ))}
            </RadioGroup>
          </div>

          <div>
            <Label htmlFor="complaint">Chief complaint</Label>
            <Textarea
              id="complaint"
              value={complaint}
              onChange={(e) => setComplaint(e.target.value)}
              placeholder="e.g. Fever 3 days, headache"
              rows={2}
              className="mt-1.5 resize-none"
            />
          </div>

          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <Receipt className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Consultation fee</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">₨</span>
                <Input
                  value={
                    feeOverride !== "" ? feeOverride : String(doctor?.consultationFee ?? 0)
                  }
                  onChange={(e) => setFeeOverride(e.target.value)}
                  className="h-8 w-24 text-right text-sm"
                  inputMode="numeric"
                />
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Select
                value={paymentMethod}
                onValueChange={(v) =>
                  setPaymentMethod(v as typeof paymentMethod)
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="CARD">Card</SelectItem>
                  <SelectItem value="ONLINE">Online</SelectItem>
                  <SelectItem value="INSURANCE">Insurance</SelectItem>
                  <SelectItem value="PANEL">Panel</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2 rounded-md border bg-background px-3">
                <input
                  type="checkbox"
                  id="feePaid"
                  checked={feePaid}
                  onChange={(e) => setFeePaid(e.target.checked)}
                  className="h-3.5 w-3.5"
                />
                <Label
                  htmlFor="feePaid"
                  className="cursor-pointer text-xs font-normal"
                >
                  Fee collected now
                </Label>
              </div>
            </div>
          </div>

          <Button
            className="w-full"
            size="lg"
            disabled={submitting || !doctorId || complaint.trim().length < 2}
            onClick={issue}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                Issuing...
              </>
            ) : (
              <>
                <span>Issue token</span>
                {visitType === "EMERGENCY" && (
                  <Badge variant="secondary" className="ml-2 bg-white/20">
                    Priority
                  </Badge>
                )}
              </>
            )}
          </Button>
        </div>
      </motion.div>

      {slip && (
        <TokenSlipDialog slip={slip} onClose={() => setSlip(null)} />
      )}
    </>
  );
}
