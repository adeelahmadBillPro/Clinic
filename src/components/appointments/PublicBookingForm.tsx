"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  CheckCircle2,
  Stethoscope,
  GraduationCap,
  Star,
  Search,
  Clock,
  Award,
  Languages as LanguagesIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DatePicker } from "@/components/shared/DatePicker";
import { PhoneInput } from "@/components/shared/PhoneInput";
import { cn } from "@/lib/utils";

type Doctor = {
  id: string;
  name: string;
  specialization: string;
  qualification: string;
  consultationFee: number;
  photoUrl: string | null;
  experienceYears: number;
  about: string | null;
  languages: string[];
  isAvailable: boolean;
  rating: number | null;
  reviewCount: number;
};

type Review = {
  id: string;
  reviewerName: string;
  rating: number;
  comment: string | null;
  createdAt: string;
};

type SlotInfo = {
  time: string;
  booked: boolean;
  past: boolean;
  available: boolean;
};

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function DoctorAvatar({
  doctor,
  size = 56,
  showDot = true,
}: {
  doctor: Doctor;
  size?: number;
  showDot?: boolean;
}) {
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div
        className="relative h-full w-full overflow-hidden rounded-full border bg-muted ring-2 ring-background"
      >
        {doctor.photoUrl ? (
          <Image
            src={doctor.photoUrl}
            alt={doctor.name}
            fill
            sizes={`${size}px`}
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-muted-foreground">
            {initials(doctor.name)}
          </div>
        )}
      </div>
      {showDot && doctor.isAvailable && (
        <span
          className="absolute bottom-0 right-0 block h-3 w-3 rounded-full border-2 border-background bg-emerald-500"
          aria-label="Online"
        />
      )}
    </div>
  );
}

export function PublicBookingForm({
  slug,
  doctors,
}: {
  slug: string;
  doctors: Doctor[];
}) {
  const [selectedId, setSelectedId] = useState<string>(doctors[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [form, setForm] = useState({
    patientName: "",
    patientPhone: "",
    appointmentDate: "",
    timeSlot: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [slots, setSlots] = useState<SlotInfo[]>([]);
  const [slotsOpen, setSlotsOpen] = useState<boolean>(true);
  const [slotsReason, setSlotsReason] = useState<string | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Fetch available slots whenever doctor or date changes
  useEffect(() => {
    if (!selectedId || !form.appointmentDate) {
      setSlots([]);
      setSlotsOpen(true);
      setSlotsReason(null);
      return;
    }
    let abort = false;
    setLoadingSlots(true);
    fetch(`/api/doctors/${selectedId}/slots?date=${form.appointmentDate}`)
      .then((r) => r.json())
      .then((body) => {
        if (abort) return;
        if (body?.success) {
          setSlots(body.data.slots ?? []);
          setSlotsOpen(body.data.open);
          setSlotsReason(body.data.reason ?? null);
          // Reset the chosen slot if it's no longer available
          const stillValid = (body.data.slots as SlotInfo[] | undefined)?.some(
            (s) => s.time === form.timeSlot && s.available,
          );
          if (!stillValid) setForm((f) => ({ ...f, timeSlot: "" }));
        }
      })
      .finally(() => {
        if (!abort) setLoadingSlots(false);
      });
    return () => {
      abort = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, form.appointmentDate]);

  useEffect(() => {
    if (!selectedId) return;
    let abort = false;
    setLoadingReviews(true);
    fetch(`/api/doctors/${selectedId}/reviews`)
      .then((r) => r.json())
      .then((body) => {
        if (!abort && body?.success) {
          setReviews(body.data);
        }
      })
      .finally(() => {
        if (!abort) setLoadingReviews(false);
      });
    return () => {
      abort = true;
    };
  }, [selectedId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return doctors;
    return doctors.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.specialization.toLowerCase().includes(q),
    );
  }, [query, doctors]);

  const selected = doctors.find((d) => d.id === selectedId) ?? doctors[0];

  async function submit() {
    if (!form.patientName.trim() || !form.patientPhone.trim()) {
      toast.error("Please fill your name and phone");
      return;
    }
    if (!form.appointmentDate) {
      toast.error("Pick a date");
      return;
    }
    if (!selected) {
      toast.error("Pick a doctor");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/book/${slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, doctorId: selected.id }),
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

  if (confirmation) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-surface flex flex-col items-center gap-4 p-8 text-center sm:p-10"
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
        <p className="max-w-md text-sm text-muted-foreground">
          We&rsquo;ll contact you on the phone you provided to confirm the exact
          time and any preparation instructions.
        </p>

        <div className="mt-2 w-full max-w-md rounded-xl border bg-muted/30 p-4 text-left">
          <p className="text-xs text-muted-foreground">
            After your visit, help future patients by leaving a review.
          </p>
          <a
            href={`/review/${confirmation}`}
            className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            Leave a review after your visit
          </a>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.05fr]">
      {/* Doctor list */}
      <div className="space-y-4">
        <div className="card-surface p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search doctors or specialities"
              className="h-11 rounded-xl pl-9"
            />
          </div>
        </div>

        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {filtered.map((d) => {
              const active = d.id === selectedId;
              return (
                <motion.button
                  key={d.id}
                  type="button"
                  onClick={() => setSelectedId(d.id)}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -1 }}
                  className={cn(
                    "group flex w-full items-center gap-3 rounded-2xl border bg-card p-3 text-left transition",
                    active
                      ? "ring-2 ring-primary shadow-md"
                      : "hover:bg-accent/40 hover:shadow-sm",
                  )}
                >
                  <DoctorAvatar doctor={d} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate text-sm font-semibold">
                        {d.name}
                      </h3>
                      {d.experienceYears > 0 && (
                        <Badge variant="secondary" className="shrink-0 h-5 gap-1 px-1.5 text-[10px]">
                          <Award className="h-3 w-3" />
                          {d.experienceYears}y
                        </Badge>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                      {d.rating !== null ? (
                        <>
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                          <span className="font-medium text-foreground">
                            {d.rating.toFixed(1)}
                          </span>
                          <span className="text-muted-foreground">
                            ({d.reviewCount})
                          </span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">New</span>
                      )}
                      <span>·</span>
                      <span className="truncate">{d.specialization}</span>
                    </div>
                    <div className="mt-1 text-[11px] font-medium text-foreground">
                      ₨ {Math.round(d.consultationFee).toLocaleString()}{" "}
                      <span className="font-normal text-muted-foreground">/ visit</span>
                    </div>
                  </div>
                  <div
                    className={cn(
                      "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "pill-mint group-hover:brightness-95",
                    )}
                  >
                    {active ? "Selected" : "Book"}
                  </div>
                </motion.button>
              );
            })}
          </AnimatePresence>
          {filtered.length === 0 && (
            <div className="card-surface p-8 text-center text-sm text-muted-foreground">
              No doctor matches &ldquo;{query}&rdquo;
            </div>
          )}
        </div>
      </div>

      {/* Detail + booking form */}
      <div className="space-y-4">
        {selected && (
          <motion.div
            key={selected.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="card-surface overflow-hidden"
          >
            <div className="relative h-24 bg-gradient-to-r from-accent via-primary/25 to-accent" />
            <div className="px-5 pb-5">
              <div className="-mt-10 flex items-end gap-4">
                <DoctorAvatar doctor={selected} size={72} showDot={false} />
                <div className="flex-1 pb-2">
                  <h2 className="text-lg font-semibold tracking-tight">
                    {selected.name}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {selected.specialization}
                  </p>
                </div>
                <div className="pb-2 text-right">
                  <div className="text-xs text-muted-foreground">Fee</div>
                  <div className="text-base font-semibold">
                    ₨ {Math.round(selected.consultationFee).toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1">
                  <GraduationCap className="h-3.5 w-3.5" />
                  {selected.qualification}
                </span>
                {selected.experienceYears > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1">
                    <Award className="h-3.5 w-3.5" />
                    {selected.experienceYears} years experience
                  </span>
                )}
                {selected.languages.length > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1">
                    <LanguagesIcon className="h-3.5 w-3.5" />
                    {selected.languages.slice(0, 3).join(", ")}
                  </span>
                )}
                <span className="inline-flex items-center gap-1 rounded-full pill-mint px-2.5 py-1">
                  <Stethoscope className="h-3.5 w-3.5" />
                  Accepting bookings
                </span>
              </div>

              {selected.about && (
                <div className="mt-4 rounded-xl bg-muted/50 p-3 text-sm leading-relaxed text-muted-foreground">
                  {selected.about}
                </div>
              )}

              {/* Reviews summary + list */}
              <div className="mt-5 border-t pt-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Patient reviews</h3>
                  {selected.rating !== null && (
                    <div className="flex items-center gap-1 text-sm">
                      <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                      <span className="font-semibold">
                        {selected.rating.toFixed(1)}
                      </span>
                      <span className="text-muted-foreground">
                        · {selected.reviewCount}{" "}
                        {selected.reviewCount === 1 ? "review" : "reviews"}
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-3 space-y-2">
                  {loadingReviews && (
                    <div className="h-16 animate-pulse rounded-lg bg-muted/40" />
                  )}
                  {!loadingReviews && reviews.length === 0 && (
                    <div className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                      No reviews yet — be the first after your visit.
                    </div>
                  )}
                  {reviews.slice(0, 3).map((r) => (
                    <div
                      key={r.id}
                      className="rounded-lg border bg-card p-3 text-sm"
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-medium">{r.reviewerName}</div>
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={cn(
                                "h-3 w-3",
                                i < r.rating
                                  ? "fill-amber-400 text-amber-400"
                                  : "text-muted-foreground/30",
                              )}
                            />
                          ))}
                        </div>
                      </div>
                      {r.comment && (
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                          {r.comment}
                        </p>
                      )}
                    </div>
                  ))}
                  {reviews.length > 3 && (
                    <div className="text-center text-[11px] text-muted-foreground">
                      + {reviews.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Booking form */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="card-surface space-y-4 p-5"
        >
          <div className="text-sm font-semibold">Your details</div>
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
              <div className="mt-1">
                <PhoneInput
                  value={form.patientPhone}
                  onChange={(v) => setForm({ ...form, patientPhone: v })}
                  placeholder="300 1234567"
                />
              </div>
            </div>
            <div>
              <Label>Preferred date</Label>
              <div className="mt-1">
                <DatePicker
                  value={form.appointmentDate}
                  onChange={(v) => setForm({ ...form, appointmentDate: v })}
                  disablePast
                  maxAhead={14}
                  placeholder="Pick a date (within 14 days)"
                />
              </div>
            </div>
            <div className="sm:col-span-2">
              <Label className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                Available time
              </Label>
              {!form.appointmentDate ? (
                <div className="mt-1 rounded-md border border-dashed bg-muted/30 p-3 text-center text-xs text-muted-foreground">
                  Pick a date first
                </div>
              ) : loadingSlots ? (
                <div className="mt-1 flex items-center gap-2 rounded-md border bg-card p-3 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Loading slots...
                </div>
              ) : !slotsOpen ? (
                <div className="mt-1 rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-center text-xs text-amber-700">
                  {slotsReason ?? "No slots on this day."}
                </div>
              ) : slots.length === 0 ? (
                <div className="mt-1 rounded-md border border-dashed bg-muted/30 p-3 text-center text-xs text-muted-foreground">
                  Doctor has no slots configured for this day.
                </div>
              ) : (
                <>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {slots.map((s) => {
                      const isSelected = form.timeSlot === s.time;
                      const disabled = !s.available;
                      return (
                        <button
                          key={s.time}
                          type="button"
                          disabled={disabled}
                          onClick={() => setForm({ ...form, timeSlot: s.time })}
                          title={
                            s.past
                              ? "Time has passed"
                              : s.booked
                                ? "Already booked"
                                : undefined
                          }
                          className={cn(
                            "rounded-full border px-2.5 py-1 text-[11px] font-medium transition",
                            isSelected &&
                              "border-primary bg-primary text-primary-foreground shadow-sm",
                            !isSelected && s.available && "bg-card hover:bg-accent/60",
                            s.booked &&
                              !isSelected &&
                              "border-dashed bg-muted text-muted-foreground line-through",
                            s.past &&
                              !isSelected &&
                              "bg-muted/40 text-muted-foreground/50",
                          )}
                        >
                          {s.time}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-[10px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-primary" />
                      Selected
                    </span>
                    <span className="inline-flex items-center gap-1 line-through">
                      Booked
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div>
            <Label>Reason for visit (optional)</Label>
            <Input
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="mt-1"
              placeholder="e.g. persistent rash for 2 weeks"
            />
          </div>

          <Button
            size="lg"
            className="w-full h-12 text-sm font-semibold"
            onClick={submit}
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                Booking...
              </>
            ) : (
              <>Book appointment with {selected?.name.split(" ")[0] ?? "doctor"}</>
            )}
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
