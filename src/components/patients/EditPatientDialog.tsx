"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/shared/DatePicker";
import { PhoneInput } from "@/components/shared/PhoneInput";

type Patient = {
  id: string;
  name: string;
  phone: string;
  gender: string;
  dob: string | null;
  address: string | null;
  bloodGroup: string | null;
  emergencyContact: string | null;
  emergencyPhone: string | null;
};

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;

export function EditPatientDialog({ patient }: { patient: Patient }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState(patient.name);
  const [phone, setPhone] = useState(patient.phone);
  const [gender, setGender] = useState(
    patient.gender === "M" || patient.gender === "F" || patient.gender === "Other"
      ? patient.gender
      : "M",
  );
  const [dob, setDob] = useState(
    patient.dob ? new Date(patient.dob).toISOString().slice(0, 10) : "",
  );
  const [address, setAddress] = useState(patient.address ?? "");
  const [bloodGroup, setBloodGroup] = useState<string>(patient.bloodGroup ?? "");
  const [emergencyContact, setEmergencyContact] = useState(
    patient.emergencyContact ?? "",
  );
  const [emergencyPhone, setEmergencyPhone] = useState(
    patient.emergencyPhone ?? "",
  );

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/patients/${patient.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          gender,
          dob: dob || null,
          address,
          bloodGroup: bloodGroup || null,
          emergencyContact,
          emergencyPhone,
        }),
      });
      const body = await res.json();
      if (!res.ok || !body?.success) {
        toast.error(body?.error ?? "Could not save");
        return;
      }
      toast.success("Patient updated");
      setOpen(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !saving && setOpen(v)}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil className="mr-1.5 h-3.5 w-3.5" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit patient</DialogTitle>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Full name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1"
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
          <div>
            <Label>Gender</Label>
            <Select
              value={gender}
              onValueChange={(v) => v && setGender(v as typeof gender)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue>
                  {gender === "M" ? "Male" : gender === "F" ? "Female" : "Other"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="M">Male</SelectItem>
                <SelectItem value="F">Female</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Date of birth</Label>
            <div className="mt-1">
              <DatePicker
                value={dob}
                onChange={(v) => setDob(v)}
                placeholder="Pick DOB (optional)"
                disableFuture
                fromYear={1900}
                toYear={new Date().getFullYear()}
              />
            </div>
          </div>
          <div>
            <Label>Blood group</Label>
            <Select
              value={bloodGroup}
              onValueChange={(v) => setBloodGroup(v ?? "")}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Unknown">
                  {bloodGroup || undefined}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {BLOOD_GROUPS.map((bg) => (
                  <SelectItem key={bg} value={bg}>
                    {bg}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label>Address</Label>
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Emergency contact</Label>
            <Input
              value={emergencyContact}
              onChange={(e) => setEmergencyContact(e.target.value)}
              className="mt-1"
              placeholder="Name / relation"
            />
          </div>
          <div>
            <Label>Emergency phone</Label>
            <div className="mt-1">
              <PhoneInput
                value={emergencyPhone}
                onChange={(v) => setEmergencyPhone(v)}
                placeholder="300 1234567"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost" disabled={saving}>
              Cancel
            </Button>
          </DialogClose>
          <Button onClick={save} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Saving
              </>
            ) : (
              "Save changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
