"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  Copy,
  MessageCircle,
  Mail,
  KeyRound,
  LinkIcon,
  Check,
} from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type Creds = {
  name: string;
  email: string;
  password: string;
  phone: string | null;
  role: string;
};

export function StaffCreatedDialog({
  creds,
  open,
  onClose,
}: {
  creds: Creds | null;
  open: boolean;
  onClose: () => void;
}) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  if (!creds) return null;

  const loginUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/login`
      : "/login";

  const allCreds = [
    `ClinicOS login`,
    `URL: ${loginUrl}`,
    `Email: ${creds.email}`,
    `Password: ${creds.password}`,
  ].join("\n");

  async function copy(text: string, field: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 1500);
    } catch {
      toast.error("Couldn't copy");
    }
  }

  const waLink = creds.phone
    ? `https://wa.me/${creds.phone.replace(/[^\d]/g, "")}?text=${encodeURIComponent(
        allCreds,
      )}`
    : `https://wa.me/?text=${encodeURIComponent(allCreds)}`;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="relative bg-accent/60 px-6 pt-8 pb-5">
          <DialogTitle className="sr-only">
            {creds.name} added to your team
          </DialogTitle>
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-2 text-center"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-emerald-700 shadow-sm ring-1 ring-emerald-500/20">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <div className="text-lg font-semibold text-accent-foreground">
              {creds.name} added to your team
            </div>
            <div className="text-xs font-normal text-accent-foreground/70">
              Share these credentials so they can log in.
            </div>
          </motion.div>
        </DialogHeader>

        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="space-y-2 px-6 pt-5"
        >
          <CredRow
            icon={<LinkIcon className="h-3.5 w-3.5" />}
            label="Login URL"
            value={loginUrl}
            copied={copiedField === "url"}
            onCopy={() => copy(loginUrl, "url")}
          />
          <CredRow
            icon={<Mail className="h-3.5 w-3.5" />}
            label="Email"
            value={creds.email}
            copied={copiedField === "email"}
            onCopy={() => copy(creds.email, "email")}
          />
          <CredRow
            icon={<KeyRound className="h-3.5 w-3.5" />}
            label="Password"
            value={creds.password}
            mono
            copied={copiedField === "password"}
            onCopy={() => copy(creds.password, "password")}
          />
        </motion.div>

        <div className="mx-6 mt-4 rounded-md bg-muted/60 p-2.5 text-[11px] leading-relaxed text-muted-foreground ring-1 ring-inset ring-border/60">
          Ask them to change the password after their first login from{" "}
          <span className="font-mono font-semibold text-foreground">
            My profile
          </span>
          .
        </div>

        <div className="mt-5 flex flex-wrap gap-2 border-t bg-muted/30 px-6 py-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => copy(allCreds, "all")}
            className="flex-1"
          >
            {copiedField === "all" ? (
              <>
                <Check className="mr-1.5 h-4 w-4" />
                Copied
              </>
            ) : (
              <>
                <Copy className="mr-1.5 h-4 w-4" />
                Copy all
              </>
            )}
          </Button>
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md bg-emerald-600 px-3 text-xs font-medium text-white transition hover:bg-emerald-700"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            WhatsApp
          </a>
          <Button size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CredRow({
  icon,
  label,
  value,
  mono,
  copied,
  onCopy,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border bg-card p-2.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div
          className={`truncate text-sm font-semibold ${mono ? "font-mono" : ""}`}
        >
          {value}
        </div>
      </div>
      <button
        type="button"
        onClick={onCopy}
        className="shrink-0 rounded-md border bg-background p-1.5 text-muted-foreground transition hover:bg-accent hover:text-foreground"
        aria-label={`Copy ${label}`}
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-emerald-600" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </button>
    </div>
  );
}
