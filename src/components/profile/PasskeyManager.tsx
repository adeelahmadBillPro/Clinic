"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Fingerprint,
  Loader2,
  Trash2,
  ShieldCheck,
  Cloud,
  Usb,
  Smartphone,
  Monitor,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Passkey = {
  id: string;
  deviceName: string | null;
  deviceType: string | null;
  backedUp: boolean;
  transports: string[];
  lastUsedAt: string | null;
  createdAt: string;
};

function formatDate(iso: string | null) {
  if (!iso) return "never";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function deviceIcon(transports: string[], type: string | null) {
  if (transports.includes("internal")) return <Smartphone className="h-4 w-4" />;
  if (transports.includes("usb")) return <Usb className="h-4 w-4" />;
  if (type === "multiDevice") return <Cloud className="h-4 w-4" />;
  return <Monitor className="h-4 w-4" />;
}

export function PasskeyManager() {
  const [keys, setKeys] = useState<Passkey[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [namePrompt, setNamePrompt] = useState(false);
  const [deviceName, setDeviceName] = useState("");

  const supported =
    typeof window !== "undefined" &&
    typeof window.PublicKeyCredential !== "undefined";

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/passkeys");
      const body = await res.json();
      if (body?.success) setKeys(body.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function startRegister() {
    if (!supported) {
      toast.error(
        "Your browser doesn't support passkeys. Use Chrome / Safari / Edge.",
      );
      return;
    }
    setRegistering(true);
    try {
      // Step 1: ask the server for registration options.
      const beginRes = await fetch("/api/passkeys/register/begin", {
        method: "POST",
      });
      const beginBody = await beginRes.json();
      if (!beginRes.ok || !beginBody?.success) {
        toast.error(beginBody?.error ?? "Couldn't start registration");
        return;
      }

      // Step 2: ask the browser to call the authenticator (Touch ID,
      // Windows Hello, security key, phone biometric). Lazy-imported to
      // keep the profile page bundle small.
      const { startRegistration } = await import("@simplewebauthn/browser");
      let response;
      try {
        // v9: pass options directly, not wrapped in { optionsJSON }.
        response = await startRegistration(beginBody.data);
      } catch (e) {
        const msg = (e as Error).message ?? "";
        if (msg.includes("already registered") || msg.includes("Excluded")) {
          toast.error(
            "This device is already registered for your account.",
          );
        } else if (msg.includes("cancelled") || msg.includes("aborted")) {
          toast("Cancelled.");
        } else {
          toast.error(msg || "Authenticator refused");
        }
        return;
      }

      // Step 3: send the attestation back for verification + persist.
      const finishRes = await fetch("/api/passkeys/register/finish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          response,
          deviceName: deviceName.trim() || undefined,
        }),
      });
      const finishBody = await finishRes.json();
      if (!finishRes.ok || !finishBody?.success) {
        toast.error(finishBody?.error ?? "Couldn't save passkey");
        return;
      }
      toast.success("Passkey added — try Sign in with passkey next time.");
      setDeviceName("");
      setNamePrompt(false);
      void load();
    } finally {
      setRegistering(false);
    }
  }

  async function remove(id: string) {
    if (
      !confirm(
        "Remove this passkey? You'll need to re-register on this device.",
      )
    ) {
      return;
    }
    setRemovingId(id);
    try {
      const res = await fetch(`/api/passkeys/${id}`, { method: "DELETE" });
      const body = await res.json();
      if (!res.ok || !body?.success) {
        toast.error(body?.error ?? "Couldn't remove");
        return;
      }
      toast.success("Passkey removed");
      void load();
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Fingerprint className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">Passkeys</h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Sign in with your fingerprint / Face ID / device PIN —
            no password to type. Add one passkey per device you use.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setNamePrompt(true)}
          disabled={registering || !supported}
        >
          {registering ? (
            <>
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              Working...
            </>
          ) : (
            <>
              <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
              Add passkey
            </>
          )}
        </Button>
      </div>

      {!supported && (
        <div className="mt-3 rounded-md border border-amber-500/30 bg-amber-500/5 p-2.5 text-[11px] text-amber-800">
          This browser doesn&rsquo;t support passkeys. Use a recent Chrome,
          Safari, Edge or Firefox.
        </div>
      )}

      <div className="mt-4">
        {loading ? (
          <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            Loading passkeys...
          </div>
        ) : !keys || keys.length === 0 ? (
          <div className="rounded-md border border-dashed bg-muted/30 p-4 text-center text-xs text-muted-foreground">
            No passkeys yet. Click <strong>Add passkey</strong> to enable
            biometric sign-in on this device.
          </div>
        ) : (
          <ul className="space-y-2">
            <AnimatePresence initial={false}>
              {keys.map((k) => (
                <motion.li
                  key={k.id}
                  layout
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  className="flex items-center gap-3 rounded-lg border bg-background p-3"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                    {deviceIcon(k.transports, k.deviceType)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-medium">
                        {k.deviceName || "Unnamed device"}
                      </span>
                      {k.backedUp && (
                        <span
                          className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700"
                          title="Synced via iCloud / Google account"
                        >
                          <Cloud className="h-2.5 w-2.5" />
                          synced
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">
                      Added {formatDate(k.createdAt)} · Last used{" "}
                      {formatDate(k.lastUsedAt)}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => remove(k.id)}
                    disabled={removingId === k.id}
                    aria-label="Remove passkey"
                  >
                    {removingId === k.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </Button>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>

      {/* Name prompt before triggering the authenticator. Optional name
          but useful when the user has multiple passkeys ("Office Mac"
          vs "iPhone 15"). */}
      <Dialog
        open={namePrompt}
        onOpenChange={(open) => !registering && setNamePrompt(open)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Fingerprint className="h-4 w-4 text-primary" />
              Add passkey
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Give this device a name so you can tell it apart from others
              later. Then your browser will prompt for fingerprint / Face
              ID / device PIN.
            </p>
            <Input
              placeholder="e.g. iPhone 15, Office Mac, Yubikey blue"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              autoFocus
              maxLength={80}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => setNamePrompt(false)}
              disabled={registering}
            >
              Cancel
            </Button>
            <Button onClick={startRegister} disabled={registering}>
              {registering ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Waiting for device...
                </>
              ) : (
                <>
                  <Check className="mr-1.5 h-3.5 w-3.5" />
                  Continue
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
