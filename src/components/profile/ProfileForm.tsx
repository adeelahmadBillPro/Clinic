"use client";

import { useState } from "react";
import type { Role } from "@prisma/client";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Loader2,
  Save,
  Shield,
  Mail,
  Phone,
  Briefcase,
  Award,
  GraduationCap,
  Languages,
  X,
  Plus,
  KeyRound,
  CheckCircle2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { PhotoPicker } from "@/components/shared/PhotoPicker";
import { PhoneInput } from "@/components/shared/PhoneInput";

type UserShape = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  photoUrl: string | null;
  memberSince: string;
  lastLoginAt: string | null;
};

type DoctorShape = {
  id: string;
  specialization: string;
  qualification: string;
  roomNumber: string | null;
  consultationFee: number;
  experienceYears: number;
  about: string | null;
  languages: string[];
  gender: string | null;
  whatsappNumber: string | null;
  photoUrl: string | null;
} | null;

export function ProfileForm({
  user,
  doctor,
}: {
  user: UserShape;
  doctor: DoctorShape;
}) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [phone, setPhone] = useState(user.phone ?? "");
  const [photoUrl, setPhotoUrl] = useState<string | null>(
    doctor?.photoUrl ?? user.photoUrl ?? null,
  );

  const [specialization, setSpecialization] = useState(doctor?.specialization ?? "");
  const [qualification, setQualification] = useState(doctor?.qualification ?? "");
  const [roomNumber, setRoomNumber] = useState(doctor?.roomNumber ?? "");
  const [fee, setFee] = useState<string>(
    doctor ? String(doctor.consultationFee) : "",
  );
  const [experienceYears, setExperienceYears] = useState<string>(
    doctor ? String(doctor.experienceYears) : "",
  );
  const [about, setAbout] = useState(doctor?.about ?? "");
  const [languages, setLanguages] = useState<string[]>(doctor?.languages ?? []);
  const [langInput, setLangInput] = useState("");
  const [gender, setGender] = useState(doctor?.gender ?? "");
  const [whatsapp, setWhatsapp] = useState(doctor?.whatsappNumber ?? "");

  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  function addLanguage() {
    const v = langInput.trim();
    if (!v) return;
    if (languages.includes(v)) {
      setLangInput("");
      return;
    }
    if (languages.length >= 12) {
      toast.error("Max 12 languages");
      return;
    }
    setLanguages([...languages, v]);
    setLangInput("");
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone,
          photoUrl,
          specialization,
          qualification,
          roomNumber,
          consultationFee: fee === "" ? undefined : Number(fee),
          experienceYears:
            experienceYears === "" ? undefined : Number(experienceYears),
          about,
          languages,
          gender,
          whatsappNumber: whatsapp,
        }),
      });
      const body = await res.json();
      if (!res.ok || !body?.success) {
        toast.error(body?.error ?? "Could not save");
        return;
      }
      toast.success("Profile updated");
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2200);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Hero card */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-surface relative overflow-hidden p-6"
      >
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-r from-primary/10 via-accent/30 to-primary/10" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end">
          <PhotoPicker value={photoUrl} onChange={setPhotoUrl} size={112} />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold tracking-tight">
                {name || "Your name"}
              </h2>
              <Badge variant="secondary" className="uppercase tracking-wide">
                {user.role}
              </Badge>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Mail className="h-3 w-3" />
                {email}
              </span>
              {phone && (
                <span className="inline-flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {phone}
                </span>
              )}
              <span>
                Member since{" "}
                {new Date(user.memberSince).toLocaleDateString(undefined, {
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Personal details */}
      <section className="card-surface p-6">
        <div className="mb-4 flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Personal details</h3>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Full name</Label>
            <Input
              className="mt-1"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <Label>Email</Label>
            <Input
              className="mt-1"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <Label>Phone</Label>
            <div className="mt-1">
              <PhoneInput
                value={phone}
                onChange={(v) => setPhone(v)}
                placeholder="300 1234567"
              />
            </div>
          </div>
          {["DOCTOR", "OWNER", "ADMIN"].includes(user.role) && (
            <div>
              <Label>Gender</Label>
              <Select value={gender} onValueChange={(v) => setGender(v ?? "")}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select">
                    {gender || undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </section>

      {/* Clinical profile — shown for DOCTOR + for OWNER/ADMIN who also practice */}
      {["DOCTOR", "OWNER", "ADMIN"].includes(user.role) && (
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="card-surface p-6"
        >
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">
                {doctor ? "Clinical profile" : "I'm also a practicing doctor"}
              </h3>
            </div>
            {!doctor && user.role !== "DOCTOR" && (
              <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                Fill & save to appear in the queue picker
              </span>
            )}
          </div>

          {!doctor && user.role !== "DOCTOR" && (
            <p className="mb-3 text-xs text-muted-foreground">
              If you see patients yourself, fill in specialization and fee — then
              you&rsquo;ll show up on <span className="font-mono">/doctor</span>{" "}
              and patients can book you from your public link.
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="flex items-center gap-1.5">
                <Award className="h-3.5 w-3.5 text-muted-foreground" />
                Specialization
              </Label>
              <Input
                className="mt-1"
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
                placeholder="e.g. Dermatologist"
              />
            </div>
            <div>
              <Label className="flex items-center gap-1.5">
                <GraduationCap className="h-3.5 w-3.5 text-muted-foreground" />
                Qualification
              </Label>
              <Input
                className="mt-1"
                value={qualification}
                onChange={(e) => setQualification(e.target.value)}
                placeholder="MBBS, FCPS"
              />
            </div>
            <div>
              <Label>Experience (years)</Label>
              <Input
                className="mt-1"
                type="number"
                min={0}
                max={60}
                value={experienceYears}
                onChange={(e) => setExperienceYears(e.target.value)}
              />
              <div className="mt-1 text-[11px] text-muted-foreground">
                Shown on your public profile and doctor cards.
              </div>
            </div>
            <div>
              <Label>Consultation fee (₨)</Label>
              <Input
                className="mt-1"
                type="number"
                min={0}
                value={fee}
                onChange={(e) => setFee(e.target.value)}
              />
            </div>
            <div>
              <Label>Room number</Label>
              <Input
                className="mt-1"
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value)}
                placeholder="e.g. 204"
              />
            </div>
            <div>
              <Label>WhatsApp number (optional)</Label>
              <div className="mt-1">
                <PhoneInput
                  value={whatsapp}
                  onChange={(v) => setWhatsapp(v)}
                  placeholder="300 1234567"
                />
              </div>
            </div>
          </div>

          <div className="mt-4">
            <Label>About / bio</Label>
            <Textarea
              className="mt-1 min-h-[96px]"
              maxLength={1000}
              value={about}
              onChange={(e) => setAbout(e.target.value)}
              placeholder="e.g. Over 10 years in clinical dermatology, treating a wide range of conditions from eczema and acne to autoimmune skin disorders."
            />
            <div className="mt-1 flex justify-end text-[11px] text-muted-foreground">
              {about.length}/1000
            </div>
          </div>

          <div className="mt-4">
            <Label className="flex items-center gap-1.5">
              <Languages className="h-3.5 w-3.5 text-muted-foreground" />
              Languages you speak
            </Label>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {languages.map((l) => (
                <Badge
                  key={l}
                  variant="secondary"
                  className="group gap-1 pr-1 pl-2"
                >
                  {l}
                  <button
                    type="button"
                    onClick={() =>
                      setLanguages(languages.filter((x) => x !== l))
                    }
                    className="rounded-full p-0.5 transition hover:bg-destructive/15 hover:text-destructive"
                    aria-label={`Remove ${l}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <Input
                value={langInput}
                onChange={(e) => setLangInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addLanguage();
                  }
                }}
                placeholder="English, Urdu, Punjabi, Pashto..."
                className="flex-1"
              />
              <Button type="button" size="sm" variant="outline" onClick={addLanguage}>
                <Plus className="mr-1 h-3.5 w-3.5" />
                Add
              </Button>
            </div>
          </div>
        </motion.section>
      )}

      <div className="sticky bottom-4 z-10 flex justify-end">
        <Button
          size="lg"
          onClick={save}
          disabled={saving}
          className="shadow-lg"
        >
          {saving ? (
            <>
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : justSaved ? (
            <>
              <CheckCircle2 className="mr-1.5 h-4 w-4" />
              Saved
            </>
          ) : (
            <>
              <Save className="mr-1.5 h-4 w-4" />
              Save changes
            </>
          )}
        </Button>
      </div>

      <PasswordSection />
    </div>
  );
}

function PasswordSection() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);

  async function change() {
    if (!current || !next) {
      toast.error("Fill both fields");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const body = await res.json();
      if (!res.ok || !body?.success) {
        toast.error(body?.error ?? "Could not update password");
        return;
      }
      toast.success("Password updated");
      setCurrent("");
      setNext("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card-surface p-6">
      <div className="mb-4 flex items-center gap-2">
        <KeyRound className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Change password</h3>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Current password</Label>
          <Input
            type="password"
            className="mt-1"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            autoComplete="current-password"
          />
        </div>
        <div>
          <Label>New password</Label>
          <Input
            type="password"
            className="mt-1"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            autoComplete="new-password"
          />
          <div className="mt-1 text-[11px] text-muted-foreground">
            8+ characters, at least one uppercase, lowercase, and number.
          </div>
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <Button variant="outline" onClick={change} disabled={busy}>
          {busy ? (
            <>
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              Updating...
            </>
          ) : (
            <>
              <KeyRound className="mr-1.5 h-4 w-4" />
              Update password
            </>
          )}
        </Button>
      </div>
    </section>
  );
}
