"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, Save, FileDown } from "lucide-react";
import { toast } from "sonner";
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
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const EXPORTS = [
  { kind: "patients", label: "Patients" },
  { kind: "tokens", label: "Tokens" },
  { kind: "consultations", label: "Consultations" },
  { kind: "bills", label: "Bills" },
  { kind: "medicines", label: "Medicines" },
  { kind: "audit", label: "Audit log" },
];

export function SettingsPanel({
  clinic,
}: {
  clinic: {
    name: string;
    phone: string | null;
    address: string | null;
    slug: string;
    settings: Record<string, unknown>;
  };
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: clinic.name,
    phone: clinic.phone ?? "",
    address: clinic.address ?? "",
    timezone: (clinic.settings.timezone as string) ?? "Asia/Karachi",
    language: (clinic.settings.language as string) ?? "en",
    tokenResetTime:
      (clinic.settings.tokenResetTime as string) ?? "00:00",
    currency: (clinic.settings.currency as string) ?? "PKR",
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/settings/clinic", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
          address: form.address,
          settings: {
            timezone: form.timezone,
            language: form.language,
            tokenResetTime: form.tokenResetTime,
            currency: form.currency,
          },
        }),
      });
      const body = await res.json();
      if (!res.ok || !body?.success) {
        toast.error(body?.error ?? "Save failed");
        return;
      }
      toast.success("Settings saved");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Clinic profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Clinic name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label>Address</Label>
              <Textarea
                rows={2}
                value={form.address}
                onChange={(e) =>
                  setForm({ ...form, address: e.target.value })
                }
                className="mt-1 resize-none"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">
                Public booking URL
              </Label>
              <div className="mt-1 flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm">
                <code>/book/{clinic.slug}</code>
                <a
                  href={`/book/${clinic.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-auto text-xs font-medium text-primary hover:underline"
                >
                  open →
                </a>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Regional & clinic config</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <Label>Timezone</Label>
                <Input
                  value={form.timezone}
                  onChange={(e) =>
                    setForm({ ...form, timezone: e.target.value })
                  }
                  className="mt-1"
                  placeholder="Asia/Karachi"
                />
              </div>
              <div>
                <Label>Language</Label>
                <Select
                  value={form.language}
                  onValueChange={(v) =>
                    v && setForm({ ...form, language: v })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="ur">Urdu</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Token reset time</Label>
                <Input
                  type="time"
                  value={form.tokenResetTime}
                  onChange={(e) =>
                    setForm({ ...form, tokenResetTime: e.target.value })
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Currency</Label>
                <Input
                  value={form.currency}
                  onChange={(e) =>
                    setForm({ ...form, currency: e.target.value })
                  }
                  className="mt-1"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              Saving
            </>
          ) : (
            <>
              <Save className="mr-1.5 h-3.5 w-3.5" />
              Save changes
            </>
          )}
        </Button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Data export</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-sm text-muted-foreground">
              Download your clinic data as CSV files. Works for backups,
              migrations, or accountant handoff.
            </p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {EXPORTS.map((e) => (
                <a
                  key={e.kind}
                  href={`/api/settings/export?kind=${e.kind}`}
                  className="flex items-center justify-between rounded-lg border p-3 text-sm hover:border-primary/40 hover:shadow-sm"
                >
                  <span className="font-medium">{e.label}</span>
                  <FileDown className="h-4 w-4 text-muted-foreground" />
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
