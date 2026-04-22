"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Plus, Loader2, Phone, Mail, MapPin } from "lucide-react";
import { toast } from "sonner";
import { PhoneInput } from "@/components/shared/PhoneInput";

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

type Supplier = {
  id: string;
  name: string;
  contact: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  isActive: boolean;
};

export function SuppliersClient({ initial }: { initial: Supplier[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    contact: "",
    phone: "",
    email: "",
    address: "",
  });

  async function save() {
    if (!form.name.trim()) {
      toast.error("Supplier name is required");
      return;
    }
    if (form.name.trim().length < 2) {
      toast.error("Name too short");
      return;
    }
    if (!form.phone.trim()) {
      toast.error("Phone number is required to contact supplier");
      return;
    }
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) {
      toast.error("Enter a valid email or leave it empty");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/inventory/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const body = await res.json();
      if (!res.ok || !body?.success) {
        toast.error(body?.error ?? "Failed");
        return;
      }
      toast.success("Supplier added");
      setOpen(false);
      setForm({ name: "", contact: "", phone: "", email: "", address: "" });
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add supplier
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>New supplier</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>
                  Supplier name <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="mt-1"
                  placeholder="ABC Pharma"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Contact person</Label>
                  <Input
                    value={form.contact}
                    onChange={(e) =>
                      setForm({ ...form, contact: e.target.value })
                    }
                    className="mt-1"
                    placeholder="Sales rep name"
                  />
                </div>
                <div>
                  <Label>
                    Phone <span className="text-destructive">*</span>
                  </Label>
                  <div className="mt-1">
                    <PhoneInput
                      value={form.phone}
                      onChange={(v) => setForm({ ...form, phone: v })}
                      placeholder="300 1234567"
                    />
                  </div>
                </div>
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="mt-1"
                  placeholder="sales@supplier.com"
                />
              </div>
              <div>
                <Label>Address</Label>
                <Input
                  value={form.address}
                  onChange={(e) =>
                    setForm({ ...form, address: e.target.value })
                  }
                  className="mt-1"
                  placeholder="Street, area, city"
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="ghost">Cancel</Button>
              </DialogClose>
              <Button onClick={save} disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Adding
                  </>
                ) : (
                  "Add"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {initial.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          No suppliers yet.
        </div>
      ) : (
        <motion.ul
          initial="initial"
          animate="animate"
          variants={{ animate: { transition: { staggerChildren: 0.03 } } }}
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
        >
          {initial.map((s) => (
            <motion.li
              key={s.id}
              variants={{
                initial: { opacity: 0, y: 6 },
                animate: { opacity: 1, y: 0 },
              }}
              className="rounded-xl border bg-card p-4"
            >
              <div className="font-medium">{s.name}</div>
              {s.contact && (
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {s.contact}
                </div>
              )}
              <div className="mt-2 space-y-1 text-xs">
                {s.phone && (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Phone className="h-3 w-3" />
                    {s.phone}
                  </div>
                )}
                {s.email && (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Mail className="h-3 w-3" />
                    {s.email}
                  </div>
                )}
                {s.address && (
                  <div className="flex items-start gap-1.5 text-muted-foreground">
                    <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                    <span>{s.address}</span>
                  </div>
                )}
              </div>
            </motion.li>
          ))}
        </motion.ul>
      )}
    </div>
  );
}
