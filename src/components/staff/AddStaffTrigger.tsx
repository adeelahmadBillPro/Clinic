"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { UserPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PasswordInput } from "@/components/shared/PasswordInput";
import { PhoneInput } from "@/components/shared/PhoneInput";
import {
  addStaffSchema,
  type AddStaffInput,
} from "@/lib/validations/staff";
import { cn } from "@/lib/utils";

const ROLES = [
  { value: "DOCTOR", label: "Doctor" },
  { value: "RECEPTIONIST", label: "Receptionist" },
  { value: "NURSE", label: "Nurse" },
  { value: "PHARMACIST", label: "Pharmacist" },
  { value: "LAB_TECH", label: "Lab tech" },
  { value: "ADMIN", label: "Admin" },
] as const;

export function AddStaffTrigger({ autoOpen }: { autoOpen?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (autoOpen) setOpen(true);
  }, [autoOpen]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    setError,
    control,
    formState: { errors },
  } = useForm<AddStaffInput>({
    resolver: zodResolver(addStaffSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      password: "",
      role: "DOCTOR",
    },
  });

  const role = watch("role");

  async function onSubmit(values: AddStaffInput) {
    setSubmitting(true);
    try {
      const res = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body?.success) {
        const field = body?.field as keyof AddStaffInput | undefined;
        if (field) {
          setError(field, {
            type: "server",
            message: body.error ?? "Invalid value",
          });
        } else {
          toast.error(body?.error ?? "Failed to add staff");
        }
        return;
      }
      // Copy-friendly credentials card in a longer toast with Copy action
      toast.success(`${values.name} added to your team`, {
        description: `Email: ${values.email}\nPassword: ${values.password}`,
        duration: 14000,
        action: {
          label: "Copy creds",
          onClick: async () => {
            try {
              await navigator.clipboard.writeText(
                `Login URL: ${location.origin}/login\nEmail: ${values.email}\nPassword: ${values.password}`,
              );
              toast.success("Credentials copied");
            } catch {
              toast.error("Couldn't copy");
            }
          },
        },
      });
      reset();
      setOpen(false);
      router.refresh();
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <UserPlus className="mr-1.5 h-3.5 w-3.5" />
          Add staff
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add staff member</DialogTitle>
          <DialogDescription>
            They&rsquo;ll receive their login email and password from you
            directly.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="space-y-4"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                aria-invalid={!!errors.name}
                className={cn("mt-1.5", errors.name && "border-destructive")}
                placeholder="Dr. Aisha Ahmad"
                {...register("name")}
              />
              {errors.name && (
                <p className="mt-1 text-xs text-destructive">
                  {errors.name.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="role">Role</Label>
              <Select
                value={role}
                onValueChange={(v) =>
                  setValue("role", v as AddStaffInput["role"])
                }
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                aria-invalid={!!errors.email}
                className={cn("mt-1.5", errors.email && "border-destructive")}
                placeholder="staff@clinic.com"
                {...register("email")}
              />
              {errors.email && (
                <p className="mt-1 text-xs text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <div className="mt-1.5">
                <Controller
                  control={control}
                  name="phone"
                  render={({ field }) => (
                    <PhoneInput
                      id="phone"
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      placeholder="300 1234567"
                    />
                  )}
                />
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Temporary password</Label>
              <button
                type="button"
                onClick={() => {
                  const pwd = generatePassword();
                  setValue("password", pwd, { shouldValidate: true });
                }}
                className="text-[11px] font-medium text-primary hover:underline"
              >
                Generate strong password
              </button>
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <PasswordInput
                id="password"
                aria-invalid={!!errors.password}
                className={cn("flex-1", errors.password && "border-destructive")}
                placeholder="Auto-generated or type one"
                {...register("password")}
              />
              <button
                type="button"
                onClick={async () => {
                  const v = watch("password");
                  if (!v) return;
                  try {
                    await navigator.clipboard.writeText(v);
                    toast.success("Password copied");
                  } catch {
                    toast.error("Couldn't copy");
                  }
                }}
                className="inline-flex h-9 items-center rounded-md border bg-card px-3 text-xs font-medium hover:bg-accent/60"
              >
                Copy
              </button>
            </div>
            {errors.password ? (
              <p className="mt-1 text-xs text-destructive">
                {errors.password.message}
              </p>
            ) : (
              <p className="mt-1 text-[11px] text-muted-foreground">
                Share these credentials with the staff member. They can change
                it after first login.
              </p>
            )}
          </div>

          <AnimatePresence>
            {role === "DOCTOR" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                className="space-y-4 rounded-lg border bg-muted/30 p-4"
              >
                <div className="text-xs font-medium text-muted-foreground">
                  Doctor profile
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="specialization">Specialization</Label>
                    <Input
                      id="specialization"
                      className="mt-1.5"
                      placeholder="General Practice"
                      aria-invalid={!!errors.specialization}
                      {...register("specialization")}
                    />
                    {errors.specialization && (
                      <p className="mt-1 text-xs text-destructive">
                        {errors.specialization.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="qualification">Qualification</Label>
                    <Input
                      id="qualification"
                      className="mt-1.5"
                      placeholder="MBBS, FCPS"
                      aria-invalid={!!errors.qualification}
                      {...register("qualification")}
                    />
                    {errors.qualification && (
                      <p className="mt-1 text-xs text-destructive">
                        {errors.qualification.message}
                      </p>
                    )}
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <Label htmlFor="roomNumber">Room #</Label>
                    <Input
                      id="roomNumber"
                      className="mt-1.5"
                      placeholder="R-101"
                      {...register("roomNumber")}
                    />
                  </div>
                  <div>
                    <Label htmlFor="consultationFee">Fee (₨)</Label>
                    <Input
                      id="consultationFee"
                      type="number"
                      min={0}
                      step={50}
                      className="mt-1.5"
                      placeholder="1500"
                      aria-invalid={!!errors.consultationFee}
                      {...register("consultationFee", { valueAsNumber: true })}
                    />
                    {errors.consultationFee && (
                      <p className="mt-1 text-xs text-destructive">
                        {errors.consultationFee.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="revenueSharePct">Revenue %</Label>
                    <Input
                      id="revenueSharePct"
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      className="mt-1.5"
                      placeholder="50"
                      {...register("revenueSharePct", { valueAsNumber: true })}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <DialogFooter className="pt-2">
            <DialogClose asChild>
              <Button type="button" variant="ghost" disabled={submitting}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add staff"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function generatePassword(): string {
  // 10 char: 2 upper, 2 lower, 2 digits, 4 mixed. Readable — no 0/O/l/1.
  const UP = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const LO = "abcdefghjkmnpqrstuvwxyz";
  const DI = "23456789";
  const MIX = UP + LO + DI;
  const rand = (s: string) => s[Math.floor(Math.random() * s.length)];
  const arr = [
    rand(UP),
    rand(UP),
    rand(LO),
    rand(LO),
    rand(DI),
    rand(DI),
    rand(MIX),
    rand(MIX),
    rand(MIX),
    rand(MIX),
  ];
  // Fisher-Yates shuffle
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.join("");
}
