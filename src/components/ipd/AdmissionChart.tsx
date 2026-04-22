"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ClipboardPen,
  Thermometer,
  Activity,
  Heart,
  Pill,
  Plus,
  Loader2,
  StickyNote,
  Clock,
  LogOut,
} from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type Vitals = {
  bp?: string;
  pulse?: string;
  temperature?: string;
  spO2?: string;
  respiratoryRate?: string;
  bloodSugar?: string;
};

type Medication = { name: string; dose?: string; time?: string };

type Note = {
  id: string;
  shift: string;
  vitals: Vitals | null;
  medications: Medication[] | null;
  observations: string | null;
  createdAt: string;
};

const SHIFT_TONE: Record<string, string> = {
  MORNING: "bg-amber-500/10 text-amber-700",
  EVENING: "bg-sky-500/10 text-sky-700",
  NIGHT: "bg-violet-500/10 text-violet-700",
};

export function AdmissionChart({
  admissionId,
  canEdit,
}: {
  admissionId: string;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [shift, setShift] = useState<"MORNING" | "EVENING" | "NIGHT">(
    defaultShift(),
  );
  const [vitals, setVitals] = useState<Vitals>({});
  const [meds, setMeds] = useState<Medication[]>([]);
  const [medInput, setMedInput] = useState<Medication>({ name: "" });
  const [observations, setObservations] = useState("");
  const [saving, setSaving] = useState(false);
  const [dischargeOpen, setDischargeOpen] = useState(false);
  const [dxDiagnosis, setDxDiagnosis] = useState("");
  const [dxNotes, setDxNotes] = useState("");
  const [discharging, setDischarging] = useState(false);

  async function discharge() {
    setDischarging(true);
    try {
      const res = await fetch(
        `/api/ipd/admissions/${admissionId}/discharge`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dischargeDiagnosis: dxDiagnosis || undefined,
            dischargeNotes: dxNotes || undefined,
          }),
        },
      );
      const body = await res.json();
      if (!res.ok || !body?.success) {
        toast.error(body?.error ?? "Discharge failed");
        return;
      }
      toast.success(
        `Discharged · ${body.data.days} ${body.data.days === 1 ? "day" : "days"}, ₨ ${Math.round(body.data.total).toLocaleString()}`,
      );
      router.push(`/billing/${body.data.billId}`);
    } finally {
      setDischarging(false);
    }
  }

  async function load() {
    const res = await fetch(
      `/api/ipd/admissions/${admissionId}/nursing-notes`,
      { cache: "no-store" },
    );
    const body = await res.json();
    if (body?.success) setNotes(body.data);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [admissionId]);

  function addMed() {
    if (!medInput.name.trim()) return;
    setMeds([...meds, { ...medInput, name: medInput.name.trim() }]);
    setMedInput({ name: "" });
  }

  async function save() {
    const hasVitals = Object.values(vitals).some((v) => v && v.toString().trim());
    if (!hasVitals && meds.length === 0 && !observations.trim()) {
      toast.error("Enter at least vitals, meds, or an observation");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(
        `/api/ipd/admissions/${admissionId}/nursing-notes`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            shift,
            vitals,
            medications: meds,
            observations,
          }),
        },
      );
      const body = await res.json();
      if (!res.ok || !body?.success) {
        toast.error(body?.error ?? "Could not save");
        return;
      }
      toast.success(`${shift} shift note saved`);
      setVitals({});
      setMeds([]);
      setObservations("");
      await load();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      {canEdit && (
        <div className="flex items-center justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDischargeOpen(true)}
            className="text-emerald-700 hover:bg-emerald-500/10"
          >
            <LogOut className="mr-1.5 h-3.5 w-3.5" />
            Discharge &amp; generate bill
          </Button>
        </div>
      )}

      {canEdit && (
        <motion.section
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-surface p-5"
        >
          <div className="mb-3 flex items-center gap-2">
            <ClipboardPen className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Log nursing note</h3>
            <div className="ml-auto flex items-center gap-1.5">
              {(["MORNING", "EVENING", "NIGHT"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setShift(s)}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[11px] font-medium transition",
                    shift === s
                      ? "border-primary bg-primary text-primary-foreground"
                      : "bg-card hover:bg-accent/40",
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Vitals grid */}
          <div className="grid gap-3 sm:grid-cols-3">
            {([
              { key: "bp", label: "BP", placeholder: "120/80", icon: <Heart className="h-3 w-3" /> },
              { key: "pulse", label: "Pulse", placeholder: "72", icon: <Activity className="h-3 w-3" /> },
              { key: "temperature", label: "Temp °F", placeholder: "98.6", icon: <Thermometer className="h-3 w-3" /> },
              { key: "spO2", label: "SpO2 %", placeholder: "98" },
              { key: "respiratoryRate", label: "RR", placeholder: "16" },
              { key: "bloodSugar", label: "Sugar (mg/dL)", placeholder: "110" },
            ] as const).map((f) => (
              <div key={f.key}>
                <Label className="flex items-center gap-1 text-xs">
                  {"icon" in f && f.icon}
                  {f.label}
                </Label>
                <Input
                  value={vitals[f.key] ?? ""}
                  onChange={(e) =>
                    setVitals({ ...vitals, [f.key]: e.target.value })
                  }
                  className="mt-1"
                  placeholder={f.placeholder}
                />
              </div>
            ))}
          </div>

          {/* Meds */}
          <div className="mt-4">
            <Label className="flex items-center gap-1 text-xs">
              <Pill className="h-3 w-3" />
              Medications given this shift
            </Label>
            {meds.length > 0 && (
              <div className="mt-2 space-y-1">
                {meds.map((m, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-md border bg-card px-2.5 py-1.5 text-xs"
                  >
                    <div>
                      <span className="font-medium">{m.name}</span>
                      {m.dose && (
                        <span className="ml-1 text-muted-foreground">
                          · {m.dose}
                        </span>
                      )}
                      {m.time && (
                        <span className="ml-1 text-muted-foreground">
                          @ {m.time}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setMeds(meds.filter((_, idx) => idx !== i))
                      }
                      className="text-muted-foreground hover:text-destructive"
                      aria-label="Remove"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_120px_100px_auto]">
              <Input
                value={medInput.name}
                onChange={(e) =>
                  setMedInput({ ...medInput, name: e.target.value })
                }
                placeholder="Medicine name"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addMed();
                  }
                }}
              />
              <Input
                value={medInput.dose ?? ""}
                onChange={(e) =>
                  setMedInput({ ...medInput, dose: e.target.value })
                }
                placeholder="Dose"
              />
              <Input
                value={medInput.time ?? ""}
                onChange={(e) =>
                  setMedInput({ ...medInput, time: e.target.value })
                }
                placeholder="HH:MM"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={addMed}
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                Add
              </Button>
            </div>
          </div>

          {/* Observations */}
          <div className="mt-4">
            <Label className="flex items-center gap-1 text-xs">
              <StickyNote className="h-3 w-3" />
              Observations
            </Label>
            <Textarea
              className="mt-1 min-h-[80px]"
              placeholder="Patient slept well, no fever spikes, ambulatory..."
              maxLength={1000}
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
            />
          </div>

          <div className="mt-4 flex justify-end">
            <Button onClick={save} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  Saving
                </>
              ) : (
                "Save nursing note"
              )}
            </Button>
          </div>
        </motion.section>
      )}

      {/* Timeline */}
      <section className="card-surface p-5">
        <div className="mb-3 flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Chart timeline</h3>
          <span className="ml-auto text-xs text-muted-foreground">
            {notes.length} {notes.length === 1 ? "entry" : "entries"}
          </span>
        </div>

        {loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            <Loader2 className="mx-auto h-4 w-4 animate-spin" />
          </div>
        ) : notes.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-xs text-muted-foreground">
            No nursing notes yet. First entry will appear at the top.
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence initial={false}>
              {notes.map((n) => (
                <motion.div
                  key={n.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-lg border bg-card p-3"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
                        SHIFT_TONE[n.shift],
                      )}
                    >
                      {n.shift} SHIFT
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(n.createdAt).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </span>
                  </div>

                  {n.vitals && Object.keys(n.vitals).length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                      {n.vitals.bp && (
                        <Chip icon={<Heart className="h-3 w-3" />}>
                          BP {n.vitals.bp}
                        </Chip>
                      )}
                      {n.vitals.pulse && (
                        <Chip icon={<Activity className="h-3 w-3" />}>
                          Pulse {n.vitals.pulse}
                        </Chip>
                      )}
                      {n.vitals.temperature && (
                        <Chip icon={<Thermometer className="h-3 w-3" />}>
                          {n.vitals.temperature}°F
                        </Chip>
                      )}
                      {n.vitals.spO2 && <Chip>SpO2 {n.vitals.spO2}%</Chip>}
                      {n.vitals.respiratoryRate && (
                        <Chip>RR {n.vitals.respiratoryRate}</Chip>
                      )}
                      {n.vitals.bloodSugar && (
                        <Chip>Sugar {n.vitals.bloodSugar}</Chip>
                      )}
                    </div>
                  )}

                  {n.medications && n.medications.length > 0 && (
                    <div className="mt-2 text-xs">
                      <span className="font-medium text-muted-foreground">
                        Meds:
                      </span>{" "}
                      {n.medications
                        .map((m) =>
                          [m.name, m.dose, m.time && `@${m.time}`]
                            .filter(Boolean)
                            .join(" "),
                        )
                        .join(", ")}
                    </div>
                  )}

                  {n.observations && (
                    <div className="mt-2 rounded-md bg-muted/40 p-2 text-xs italic">
                      {n.observations}
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </section>

      {/* Discharge dialog */}
      <Dialog
        open={dischargeOpen}
        onOpenChange={(v) => !v && !discharging && setDischargeOpen(false)}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-700">
              <LogOut className="h-4 w-4" />
              Discharge &amp; generate bill
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Discharge diagnosis</Label>
              <Textarea
                rows={2}
                value={dxDiagnosis}
                onChange={(e) => setDxDiagnosis(e.target.value)}
                className="mt-1 resize-none"
                placeholder="Final clinical impression"
              />
            </div>
            <div>
              <Label>Notes / follow-up</Label>
              <Textarea
                rows={3}
                value={dxNotes}
                onChange={(e) => setDxNotes(e.target.value)}
                className="mt-1 resize-none"
                placeholder="Medications at home, follow-up schedule..."
              />
            </div>
            <div className="rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 p-3 text-xs text-muted-foreground">
              Final bill: bed charges × days + linked pharmacy + lab orders.
              You&rsquo;ll be taken to the bill to collect payment.
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost" disabled={discharging}>
                Cancel
              </Button>
            </DialogClose>
            <Button onClick={discharge} disabled={discharging}>
              {discharging ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Discharging
                </>
              ) : (
                "Discharge & bill"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Chip({
  children,
  icon,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium">
      {icon}
      {children}
    </span>
  );
}

function defaultShift(): "MORNING" | "EVENING" | "NIGHT" {
  const h = new Date().getHours();
  if (h < 14) return "MORNING";
  if (h < 22) return "EVENING";
  return "NIGHT";
}
