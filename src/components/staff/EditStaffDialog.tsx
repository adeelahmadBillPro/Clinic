"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import type { Role } from "@prisma/client";

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
import { PhoneInput } from "@/components/shared/PhoneInput";

type Staff = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  specialization: string | null;
  qualification: string | null;
  roomNumber: string | null;
  consultationFee: number | null;
  revenueSharePct: number | null;
};

export function EditStaffDialog({
  staff,
  open,
  onClose,
}: {
  staff: Staff | null;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState(staff?.name ?? "");
  const [email, setEmail] = useState(staff?.email ?? "");
  const [phone, setPhone] = useState(staff?.phone ?? "");
  const [specialization, setSpecialization] = useState(
    staff?.specialization ?? "",
  );
  const [qualification, setQualification] = useState(
    staff?.qualification ?? "",
  );
  const [roomNumber, setRoomNumber] = useState(staff?.roomNumber ?? "");
  const [consultationFee, setConsultationFee] = useState<string>(
    staff?.consultationFee !== null && staff?.consultationFee !== undefined
      ? String(staff.consultationFee)
      : "",
  );
  const [revenueSharePct, setRevenueSharePct] = useState<string>(
    staff?.revenueSharePct !== null && staff?.revenueSharePct !== undefined
      ? String(staff.revenueSharePct)
      : "",
  );

  // Reset form when dialog opens with a new staff member
  if (staff && open && name !== staff.name && saving === false) {
    // One-shot seed; React will re-render
  }

  async function save() {
    if (!staff) return;
    if (!name.trim() || !email.trim()) {
      toast.error("Name and email are required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/staff/${staff.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone,
          ...(staff.role === "DOCTOR"
            ? {
                specialization,
                qualification,
                roomNumber,
                consultationFee:
                  consultationFee === "" ? undefined : Number(consultationFee),
                revenueSharePct:
                  revenueSharePct === ""
                    ? undefined
                    : Number(revenueSharePct),
              }
            : {}),
        }),
      });
      const body = await res.json();
      if (!res.ok || !body?.success) {
        toast.error(body?.error ?? "Could not save");
        return;
      }
      toast.success(`${name} updated`);
      onClose();
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !saving && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            <span className="inline-flex items-center gap-2">
              <Pencil className="h-4 w-4 text-primary" />
              Edit {staff?.name ?? "staff"}
            </span>
          </DialogTitle>
        </DialogHeader>

        {staff && (
          <>
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
                <Label>Email</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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

              {staff.role === "DOCTOR" && (
                <>
                  <div>
                    <Label>Specialization</Label>
                    <Input
                      value={specialization}
                      onChange={(e) => setSpecialization(e.target.value)}
                      className="mt-1"
                      placeholder="Dermatologist"
                    />
                  </div>
                  <div>
                    <Label>Qualification</Label>
                    <Input
                      value={qualification}
                      onChange={(e) => setQualification(e.target.value)}
                      className="mt-1"
                      placeholder="MBBS, FCPS"
                    />
                  </div>
                  <div>
                    <Label>Room</Label>
                    <Input
                      value={roomNumber}
                      onChange={(e) => setRoomNumber(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Consultation fee (₨)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={consultationFee}
                      onChange={(e) => setConsultationFee(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Revenue share (%)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={revenueSharePct}
                      onChange={(e) => setRevenueSharePct(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </>
              )}
            </div>
          </>
        )}

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
