"use client";

import { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ActivitySquare,
  ClipboardPen,
  ScanSearch,
  Pill,
  CheckCircle2,
  Loader2,
  Send,
  UserCog,
} from "lucide-react";
import { toast } from "sonner";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AllergyBanner } from "@/components/shared/AllergyBanner";
import { DiagnosisInput } from "./DiagnosisInput";
import { PrescriptionBuilder } from "./PrescriptionBuilder";
import { ReferDialog } from "./ReferDialog";
import type { MedicineItem, DiagnosisItem } from "@/lib/validations/consultation";

type Token = {
  id: string;
  displayToken: string;
  status: string;
  chiefComplaint: string | null;
  issuedAt: string;
  patient: {
    id: string;
    name: string;
    phone: string;
    mrn: string;
    allergies: string[];
    gender: string;
  } | null;
  doctor?: {
    id: string;
    name: string;
  } | null;
};

export function ConsultationPanel({
  token,
  onDone,
  userId,
}: {
  token: Token;
  onDone: () => void;
  userId?: string;
}) {
  const patient = token.patient;

  const [bp, setBp] = useState("");
  const [pulse, setPulse] = useState("");
  const [temperature, setTemperature] = useState("");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [spO2, setSpO2] = useState("");
  const [bloodSugar, setBloodSugar] = useState("");

  const [subjective, setSubjective] = useState(token.chiefComplaint ?? "");
  const [objective, setObjective] = useState("");
  const [assessment, setAssessment] = useState("");
  const [planText, setPlanText] = useState("");

  const [diagnoses, setDiagnoses] = useState<DiagnosisItem[]>([]);
  const [medicines, setMedicines] = useState<MedicineItem[]>([]);
  const [prescriptionNotes, setPrescriptionNotes] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");

  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [referOpen, setReferOpen] = useState(false);
  const [outstanding, setOutstanding] = useState<number | null>(null);

  // Reset form when token changes
  useEffect(() => {
    setBp("");
    setPulse("");
    setTemperature("");
    setWeight("");
    setHeight("");
    setSpO2("");
    setBloodSugar("");
    setSubjective(token.chiefComplaint ?? "");
    setObjective("");
    setAssessment("");
    setPlanText("");
    setDiagnoses([]);
    setMedicines([]);
    setPrescriptionNotes("");
    setFollowUpDate("");
  }, [token.id, token.chiefComplaint]);

  // Fetch fee/outstanding status for the current patient
  useEffect(() => {
    if (!patient?.id) return;
    let aborted = false;
    fetch(`/api/patients/${patient.id}`)
      .then((r) => r.json())
      .then((body) => {
        if (!aborted && body?.success) {
          setOutstanding(body.data.outstandingConsultation ?? 0);
        }
      })
      .catch(() => {});
    return () => {
      aborted = true;
    };
  }, [patient?.id]);

  const bmi =
    weight && height
      ? (Number(weight) / Math.pow(Number(height) / 100, 2)).toFixed(1)
      : null;

  const save = useCallback(
    async (complete = false) => {
      // If completing with an unpaid consultation bill, confirm first.
      if (complete && outstanding !== null && outstanding > 0) {
        const ok = window.confirm(
          `Consultation fee is UNPAID (₨ ${Math.round(outstanding).toLocaleString()} owed).\n\n` +
            `Tell the patient to pay at reception before leaving.\n\n` +
            `Mark this consultation complete anyway?`,
        );
        if (!ok) return;
      }
      const setBusy = complete ? setCompleting : setSaving;
      setBusy(true);
      try {
        const res = await fetch("/api/consultations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tokenId: token.id,
            vitals: {
              bp,
              pulse,
              temperature,
              weight,
              height,
              spO2,
              bloodSugar,
            },
            subjective,
            objective,
            assessment,
            plan: planText,
            diagnoses,
            medicines,
            prescriptionNotes,
            followUpDate: followUpDate || undefined,
            complete,
          }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok || !body?.success) {
          toast.error(body?.error ?? "Failed to save");
          return;
        }
        if (complete) {
          const rxId: string | null = body?.data?.prescriptionId ?? null;
          toast.success(`Consultation complete · ${token.displayToken}`, {
            description: rxId
              ? "Click below to print the prescription for the patient."
              : undefined,
            duration: 8000,
            action: rxId
              ? {
                  label: "Print Rx",
                  onClick: () => {
                    window.open(`/prescriptions/${rxId}`, "_blank");
                  },
                }
              : undefined,
          });
          if (outstanding !== null && outstanding > 0) {
            toast.warning(
              `Reception se fee ₨ ${Math.round(outstanding).toLocaleString()} collect karvain`,
              { duration: 10000 },
            );
          }
          onDone();
        } else {
          toast.success("Saved");
        }
      } catch {
        toast.error("Network error");
      } finally {
        setBusy(false);
      }
    },
    [
      token.id,
      token.displayToken,
      bp,
      pulse,
      temperature,
      weight,
      height,
      spO2,
      bloodSugar,
      subjective,
      objective,
      assessment,
      planText,
      diagnoses,
      medicines,
      prescriptionNotes,
      followUpDate,
      outstanding,
      onDone,
    ],
  );

  const allergyInteractions = (() => {
    if (!patient?.allergies?.length || medicines.length === 0) return [];
    const hits: string[] = [];
    for (const m of medicines) {
      for (const a of patient.allergies) {
        const name = (m.name + " " + (m.genericName ?? "")).toLowerCase();
        if (name.includes(a.toLowerCase())) {
          hits.push(`${m.name} may conflict with reported allergy: ${a}`);
        }
      }
    }
    return hits;
  })();

  return (
    <motion.div
      layout
      className="rounded-xl border bg-card p-5"
      key={token.id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b pb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-mono text-base font-bold text-primary">
              {token.displayToken}
            </span>
            <Badge variant="secondary" className="text-[10px]">
              {token.status}
            </Badge>
          </div>
          <h2 className="mt-1 text-xl font-semibold">
            {patient?.name ?? "Unknown patient"}
          </h2>
          <div className="mt-0.5 text-xs text-muted-foreground">
            {patient?.mrn} · {patient?.phone} ·{" "}
            {patient?.gender === "M" ? "Male" : patient?.gender === "F" ? "Female" : "Other"}
          </div>
          {outstanding !== null && (
            <div className="mt-2">
              {outstanding > 0 ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-destructive/30 bg-destructive/10 px-2.5 py-1 text-[11px] font-semibold text-destructive">
                  <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
                  Fee unpaid · ₨ {Math.round(outstanding).toLocaleString()} owed
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Consultation fee paid
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {patient?.allergies && patient.allergies.length > 0 && (
        <div className="mb-4">
          <AllergyBanner allergies={patient.allergies} />
        </div>
      )}

      <Tabs defaultValue="vitals">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="vitals" className="gap-1.5">
            <ActivitySquare className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Vitals</span>
          </TabsTrigger>
          <TabsTrigger value="soap" className="gap-1.5">
            <ClipboardPen className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">SOAP</span>
          </TabsTrigger>
          <TabsTrigger value="diagnosis" className="gap-1.5">
            <ScanSearch className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Diagnosis</span>
          </TabsTrigger>
          <TabsTrigger value="prescription" className="gap-1.5">
            <Pill className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Prescription</span>
            {medicines.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-[10px]">
                {medicines.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vitals" className="mt-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <VField label="BP (mmHg)" placeholder="120/80" value={bp} onChange={setBp} />
            <VField label="Pulse (bpm)" placeholder="72" value={pulse} onChange={setPulse} type="number" />
            <VField label="Temp (°C)" placeholder="36.8" value={temperature} onChange={setTemperature} type="number" />
            <VField label="Weight (kg)" placeholder="72" value={weight} onChange={setWeight} type="number" />
            <VField label="Height (cm)" placeholder="170" value={height} onChange={setHeight} type="number" />
            <VField label="SpO₂ (%)" placeholder="98" value={spO2} onChange={setSpO2} type="number" />
            <VField
              label="Blood sugar (mg/dL)"
              placeholder="110"
              value={bloodSugar}
              onChange={setBloodSugar}
              type="number"
            />
            {bmi && (
              <div className="flex flex-col justify-end text-xs text-muted-foreground">
                <span className="font-medium text-foreground">BMI {bmi}</span>
                {Number(bmi) < 18.5 && "Underweight"}
                {Number(bmi) >= 18.5 && Number(bmi) < 25 && "Normal range"}
                {Number(bmi) >= 25 && Number(bmi) < 30 && "Overweight"}
                {Number(bmi) >= 30 && "Obese"}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="soap" className="mt-4 space-y-3">
          <SField
            label="Subjective"
            helper="Patient-reported symptoms, history"
            value={subjective}
            onChange={setSubjective}
          />
          <SField
            label="Objective"
            helper="Examination findings, vitals interpretation"
            value={objective}
            onChange={setObjective}
          />
          <SField
            label="Assessment"
            helper="Clinical impression, differential diagnoses"
            value={assessment}
            onChange={setAssessment}
          />
          <SField
            label="Plan"
            helper="Treatment plan, tests ordered, follow-up"
            value={planText}
            onChange={setPlanText}
          />
        </TabsContent>

        <TabsContent value="diagnosis" className="mt-4">
          <DiagnosisInput value={diagnoses} onChange={setDiagnoses} />
        </TabsContent>

        <TabsContent value="prescription" className="mt-4 space-y-4">
          <PrescriptionBuilder
            value={medicines}
            onChange={setMedicines}
            patientAllergies={patient?.allergies ?? []}
            userId={userId}
          />
          {allergyInteractions.length > 0 && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
              <div className="font-semibold">⚠ Possible allergy conflicts</div>
              <ul className="mt-1 list-inside list-disc space-y-0.5">
                {allergyInteractions.map((msg, i) => (
                  <li key={i}>{msg}</li>
                ))}
              </ul>
            </div>
          )}
          <div>
            <Label htmlFor="rxNotes">Prescription notes</Label>
            <Textarea
              id="rxNotes"
              value={prescriptionNotes}
              onChange={(e) => setPrescriptionNotes(e.target.value)}
              rows={2}
              className="mt-1.5 resize-none"
              placeholder="Lifestyle advice, precautions..."
            />
          </div>
        </TabsContent>
      </Tabs>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
        <div className="flex items-center gap-2">
          <Label htmlFor="followUp" className="text-xs text-muted-foreground">
            Follow up
          </Label>
          <Input
            id="followUp"
            type="date"
            value={followUpDate}
            onChange={(e) => setFollowUpDate(e.target.value)}
            className="h-9 w-auto"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => save(false)}
            disabled={saving}
          >
            {saving ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Saving
              </>
            ) : (
              <>
                <Send className="mr-1.5 h-3.5 w-3.5" />
                Save draft
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setReferOpen(true)}
            disabled={saving || completing}
          >
            <UserCog className="mr-1.5 h-3.5 w-3.5" />
            Refer to doctor
          </Button>
          <Button onClick={() => save(true)} disabled={completing} size="sm">
            {completing ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Completing
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                Complete consultation
              </>
            )}
          </Button>
        </div>
      </div>
      {referOpen && token.doctor && patient && (
        <ReferDialog
          tokenId={token.id}
          currentDoctorId={token.doctor.id}
          patientName={patient.name}
          onClose={() => setReferOpen(false)}
          onReferred={() => {
            setReferOpen(false);
            onDone();
          }}
        />
      )}
    </motion.div>
  );
}

function VField({
  label,
  placeholder,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1"
      />
    </div>
  );
}

function SField({
  label,
  helper,
  value,
  onChange,
}: {
  label: string;
  helper: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <Label className="text-sm font-medium">{label}</Label>
        <span className="text-[11px] text-muted-foreground">{helper}</span>
      </div>
      <Textarea
        rows={2}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="resize-y"
      />
    </div>
  );
}
