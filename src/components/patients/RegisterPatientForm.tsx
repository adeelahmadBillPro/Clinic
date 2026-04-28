"use client";

import { useEffect, useRef, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { inferGenderFromName } from "@/lib/gender-from-name";
import { useEnterTabsForward } from "@/lib/hooks/useEnterTabsForward";

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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { TagInput } from "./TagInput";
import { DatePicker } from "@/components/shared/DatePicker";
import { PhoneInput } from "@/components/shared/PhoneInput";
import { FieldHelp } from "@/components/shared/FieldHelp";
import {
  createPatientSchema,
  type CreatePatientInput,
} from "@/lib/validations/patient";
import { cn } from "@/lib/utils";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;
const COMMON_ALLERGIES = [
  "Penicillin",
  "Sulfa",
  "Aspirin",
  "Peanuts",
  "Dust",
  "Pollen",
  "Latex",
];
const COMMON_CONDITIONS = [
  "Hypertension",
  "Diabetes Type 2",
  "Asthma",
  "Thyroid",
  "Heart disease",
];

type CreatedPatient = { id: string; mrn: string; name: string; phone: string };

export function RegisterPatientForm({
  onCreated,
  compact,
}: {
  onCreated?: (p: CreatedPatient) => void;
  compact?: boolean;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [duplicate, setDuplicate] = useState<null | {
    name: string;
    mrn: string;
    phone: string;
  }>(null);
  const [pendingValues, setPendingValues] = useState<CreatePatientInput | null>(
    null,
  );
  const [issueTokenNow, setIssueTokenNow] = useState(true);
  const [doctors, setDoctors] = useState<
    Array<{
      id: string;
      name: string;
      specialization: string;
      consultationFee?: number;
    }>
  >([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>("");
  const [chiefComplaint, setChiefComplaint] = useState<string>("");
  const [feePaidNow, setFeePaidNow] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<
    "CASH" | "CARD" | "ONLINE" | "INSURANCE" | "PANEL"
  >("CASH");

  useEffect(() => {
    let aborted = false;
    fetch("/api/doctors")
      .then((r) => r.json())
      .then((body) => {
        if (!aborted && body?.success) {
          setDoctors(body.data);
          if (body.data.length > 0) setSelectedDoctorId(body.data[0].id);
        }
      })
      .catch(() => {});
    return () => {
      aborted = true;
    };
  }, []);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm<CreatePatientInput>({
    resolver: zodResolver(createPatientSchema),
    defaultValues: {
      name: "",
      phone: "",
      gender: "M",
      dob: "",
      address: "",
      bloodGroup: "",
      allergies: [],
      chronicConditions: [],
      emergencyContact: "",
      emergencyPhone: "",
    },
  });

  const dobValue = watch("dob");
  const ageLabel = computeAgeLabel(dobValue);

  // Auto-detect gender from the typed name (Mr/Mrs prefix or known PK
  // first name). The instant the receptionist clicks a gender radio
  // we lock it — no surprise overrides while they're filling the form.
  // Reset when the form clears (after a successful submit) so the next
  // patient gets fresh detection again.
  const genderManuallySet = useRef(false);
  const nameValue = watch("name");
  useEffect(() => {
    if (genderManuallySet.current) return;
    const guess = inferGenderFromName(nameValue ?? "");
    if (guess) {
      setValue("gender", guess, { shouldValidate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nameValue]);

  async function submit(values: CreatePatientInput, forceCreate = false) {
    setSubmitting(true);
    try {
      const payload = {
        ...values,
        forceCreate,
        autoIssueToken: issueTokenNow && !!selectedDoctorId,
        autoIssueDoctorId: issueTokenNow ? selectedDoctorId : undefined,
        autoIssueChiefComplaint: issueTokenNow ? chiefComplaint : undefined,
        feePaidNow: issueTokenNow ? feePaidNow : undefined,
        paymentMethod: issueTokenNow ? paymentMethod : undefined,
      };
      const res = await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));

      if (res.status === 409 && body?.code === "DUPLICATE_PHONE") {
        setDuplicate(body.match);
        setPendingValues(values);
        return;
      }

      if (!res.ok || !body?.success) {
        const field = body?.field as keyof CreatePatientInput | undefined;
        if (field) {
          setError(field, { type: "server", message: body.error });
        } else {
          toast.error(body?.error ?? "Could not register patient");
        }
        return;
      }

      if (body.data.token && body.data.bill) {
        toast.success(
          `Patient registered · ${body.data.mrn} · Token ${body.data.token.displayToken} · Bill ${body.data.bill.billNumber} (${body.data.bill.status})`,
        );
      } else if (body.data.token) {
        toast.success(
          `Patient registered · ${body.data.mrn} · Token ${body.data.token.displayToken}`,
        );
      } else {
        toast.success(`Patient registered · ${body.data.mrn}`);
      }
      onCreated?.(body.data);
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  const handleEnterTab = useEnterTabsForward();

  return (
    <form
      noValidate
      onSubmit={handleSubmit((v) => submit(v, false))}
      onKeyDown={handleEnterTab}
      className={cn("space-y-4", compact && "text-sm")}
    >
      <AnimatePresence>
        {duplicate && pendingValues && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3.5 text-sm"
          >
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <div className="min-w-0">
                <div className="font-medium text-amber-800">
                  Existing patient with this phone
                </div>
                <div className="mt-1 text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {duplicate.name}
                  </span>{" "}
                  · {duplicate.mrn} · {duplicate.phone}
                </div>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      onCreated?.({
                        id: "",
                        mrn: duplicate.mrn,
                        name: duplicate.name,
                        phone: duplicate.phone,
                      })
                    }
                  >
                    Use existing patient
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => submit(pendingValues, true)}
                    disabled={submitting}
                  >
                    Register as new anyway
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setDuplicate(null);
                      setPendingValues(null);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="p-name">
            Full name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="p-name"
            className={cn("mt-1.5", errors.name && "border-destructive")}
            placeholder="Muhammad Ali"
            aria-invalid={!!errors.name}
            {...register("name")}
          />
          {errors.name && (
            <p className="mt-1 text-xs text-destructive">
              {errors.name.message}
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="p-phone">
            Phone{" "}
            <span className="text-muted-foreground text-xs font-normal">
              (optional)
            </span>
          </Label>
          <div className={cn("mt-1.5", errors.phone && "[&_input]:border-destructive")}>
            <Controller
              control={control}
              name="phone"
              render={({ field }) => (
                <PhoneInput
                  id="p-phone"
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  placeholder="300 1234567"
                />
              )}
            />
          </div>
          {errors.phone && (
            <p className="mt-1 text-xs text-destructive">
              {errors.phone.message}
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Gender</Label>
          <Controller
            control={control}
            name="gender"
            render={({ field }) => (
              <RadioGroup
                value={field.value}
                onValueChange={(v) => {
                  // Lock gender once the user picks themselves — auto-detect
                  // from name shouldn't override their explicit choice.
                  genderManuallySet.current = true;
                  field.onChange(v);
                }}
                className="mt-1.5 grid grid-cols-3 gap-1 rounded-lg border bg-muted/40 p-1"
              >
                {(["M", "F", "Other"] as const).map((g) => (
                  <label
                    key={g}
                    className={cn(
                      "flex cursor-pointer items-center justify-center rounded-md px-3 py-1.5 text-xs font-medium transition",
                      field.value === g
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-background",
                    )}
                  >
                    <RadioGroupItem value={g} className="sr-only" />
                    {g === "M" ? "Male" : g === "F" ? "Female" : "Other"}
                  </label>
                ))}
              </RadioGroup>
            )}
          />
        </div>
        <div>
          <Label htmlFor="p-blood">Blood group</Label>
          <Controller
            control={control}
            name="bloodGroup"
            render={({ field }) => (
              <Select
                value={field.value ?? ""}
                onValueChange={(v) => field.onChange(v)}
              >
                <SelectTrigger id="p-blood" className="mt-1.5">
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  {BLOOD_GROUPS.map((b) => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      <div>
        <div className="flex items-baseline justify-between">
          <Label htmlFor="p-age">
            Age{" "}
            <span className="text-xs font-normal text-muted-foreground">
              (years · or pick date of birth)
            </span>
          </Label>
          {ageLabel && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              {ageLabel}
            </span>
          )}
        </div>
        <Controller
          control={control}
          name="dob"
          render={({ field }) => {
            const dobVal = field.value ?? "";
            const approxAge = dobVal
              ? (() => {
                  const d = new Date(dobVal);
                  if (isNaN(d.getTime())) return "";
                  const age = new Date().getFullYear() - d.getFullYear();
                  return age >= 0 && age <= 130 ? String(age) : "";
                })()
              : "";
            // Reception in PK clinics asks "age?" first, exact DOB rarely.
            // Age input goes left (primary), DatePicker stays as the
            // precise option on the right.
            return (
              <div className="mt-1.5 grid grid-cols-[110px_minmax(0,2fr)] gap-2">
                <input
                  id="p-age"
                  type="number"
                  min={0}
                  max={130}
                  placeholder="Age (yrs)"
                  value={approxAge}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "") {
                      field.onChange("");
                      return;
                    }
                    const age = parseInt(v, 10);
                    if (isNaN(age) || age < 0 || age > 130) return;
                    const d = new Date();
                    d.setFullYear(d.getFullYear() - age, 0, 1);
                    d.setHours(0, 0, 0, 0);
                    const iso = `${d.getFullYear()}-01-01`;
                    field.onChange(iso);
                  }}
                  className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
                <DatePicker
                  value={dobVal}
                  onChange={field.onChange}
                  placeholder="Pick date of birth (optional)"
                  disableFuture
                  fromYear={1900}
                  toYear={new Date().getFullYear()}
                />
              </div>
            );
          }}
        />
        {errors.dob && (
          <p className="mt-1 text-xs text-destructive">
            {errors.dob.message}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="p-address">Address</Label>
        <Textarea
          id="p-address"
          rows={2}
          className="mt-1.5 resize-none"
          placeholder="Street, area, city..."
          {...register("address")}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>
            Known allergies
            <FieldHelp>
              Comma-separated. Shown as a red badge on every screen the
              patient appears (token board, doctor desk, prescription).
            </FieldHelp>
          </Label>
          <Controller
            control={control}
            name="allergies"
            render={({ field }) => (
              <TagInput
                value={field.value ?? []}
                onChange={field.onChange}
                placeholder="Type and press Enter"
                suggestions={COMMON_ALLERGIES}
                className="mt-1.5"
              />
            )}
          />
        </div>
        <div>
          <Label>
            Chronic conditions
            <FieldHelp>
              Long-term conditions like Diabetes / Hypertension. Doctor
              sees these on every consultation as a quick reference.
            </FieldHelp>
          </Label>
          <Controller
            control={control}
            name="chronicConditions"
            render={({ field }) => (
              <TagInput
                value={field.value ?? []}
                onChange={field.onChange}
                placeholder="Type and press Enter"
                suggestions={COMMON_CONDITIONS}
                className="mt-1.5"
              />
            )}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="p-emergency-contact">Emergency contact name</Label>
          <Input
            id="p-emergency-contact"
            className="mt-1.5"
            placeholder="Relation — e.g. Brother, Amjad"
            {...register("emergencyContact")}
          />
        </div>
        <div>
          <Label htmlFor="p-emergency-phone">Emergency contact phone</Label>
          <div className="mt-1.5">
            <Controller
              control={control}
              name="emergencyPhone"
              render={({ field }) => (
                <PhoneInput
                  id="p-emergency-phone"
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  placeholder="300 1234567"
                />
              )}
            />
          </div>
        </div>
      </div>

      {/* Auto-issue token section — always visible when a doctor exists */}
      {doctors.length > 0 && (
        <div
          className={cn(
            "rounded-xl border p-4 transition",
            issueTokenNow
              ? "border-primary/40 bg-accent/30"
              : "border-dashed bg-muted/20",
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold">
                {issueTokenNow ? (
                  <>
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      ✓
                    </span>
                    Token will be issued automatically
                  </>
                ) : (
                  <>Token issue skipped</>
                )}
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                {issueTokenNow
                  ? "Next available token number will be assigned and the patient added to the doctor's queue instantly."
                  : "Patient will be registered only. You can issue a token later from Reception."}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIssueTokenNow(!issueTokenNow)}
              className="shrink-0 rounded-full border bg-card px-3 py-1 text-xs font-medium transition hover:bg-accent/60"
            >
              {issueTokenNow ? "Skip token" : "Enable token"}
            </button>
          </div>

          {issueTokenNow && (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-xs">Doctor</Label>
                <Select
                  value={selectedDoctorId}
                  onValueChange={(v) => v && setSelectedDoctorId(v)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue>
                      {doctors.find((d) => d.id === selectedDoctorId)
                        ? `${doctors.find((d) => d.id === selectedDoctorId)?.name} · ${doctors.find((d) => d.id === selectedDoctorId)?.specialization}`
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
              </div>
              <div>
                <Label className="text-xs">Chief complaint (optional)</Label>
                <Input
                  className="mt-1"
                  value={chiefComplaint}
                  onChange={(e) => setChiefComplaint(e.target.value)}
                  placeholder="e.g. fever + cough x 3 days"
                  maxLength={200}
                />
              </div>
            </div>
          )}

          {/* Consultation fee collection — always shown once a doctor is
              picked so reception knows whether to collect now or later. */}
          {issueTokenNow && selectedDoctorId && (
            <div className="mt-3 rounded-lg border border-dashed bg-background p-3 text-xs">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium text-foreground">
                    Consultation fee:{" "}
                    <span className="font-semibold">
                      ₨{" "}
                      {Math.round(
                        doctors.find((d) => d.id === selectedDoctorId)
                          ?.consultationFee ?? 0,
                      ).toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-0.5 text-muted-foreground">
                    A bill is always created. Pharmacy meds are billed
                    separately — patient can skip pharmacy freely.
                  </div>
                </div>
                <label className="flex cursor-pointer items-center gap-1.5 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={feePaidNow}
                    onChange={(e) => setFeePaidNow(e.target.checked)}
                    className="h-3.5 w-3.5 cursor-pointer rounded border-input accent-primary"
                  />
                  <span className="font-medium">Fee paid now</span>
                </label>
              </div>
              {feePaidNow && (
                <div className="mt-2 grid grid-cols-5 gap-1">
                  {(["CASH", "CARD", "ONLINE", "INSURANCE", "PANEL"] as const).map(
                    (m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setPaymentMethod(m)}
                        className={cn(
                          "rounded-md border px-2 py-1 text-[10px] font-medium transition",
                          paymentMethod === m
                            ? "border-primary bg-primary text-primary-foreground"
                            : "bg-card hover:bg-accent/40",
                        )}
                      >
                        {m}
                      </button>
                    ),
                  )}
                </div>
              )}
              {!feePaidNow && (
                <div className="mt-2 rounded-md bg-amber-500/10 px-2 py-1 text-[11px] font-medium text-amber-700">
                  Bill will be PENDING. Collect at reception after the visit.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              Registering...
            </>
          ) : issueTokenNow ? (
            "Register & issue token"
          ) : (
            "Register patient"
          )}
        </Button>
      </div>
    </form>
  );
}

function computeAgeLabel(dob: string | undefined | null): string | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  if (d > now) return null;

  let years = now.getFullYear() - d.getFullYear();
  let months = now.getMonth() - d.getMonth();
  let days = now.getDate() - d.getDate();

  if (days < 0) {
    months -= 1;
    const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    days += prevMonth.getDate();
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  if (years >= 2) return `Age ${years} years`;
  if (years === 1) {
    return months > 0
      ? `Age 1 year ${months} mo`
      : `Age 1 year`;
  }
  if (months >= 1) {
    return days > 0
      ? `Age ${months} mo ${days}d`
      : `Age ${months} months`;
  }
  return `Age ${days} day${days === 1 ? "" : "s"}`;
}
