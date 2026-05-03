"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { motion } from "framer-motion";
import { Fingerprint, Loader2 } from "lucide-react";
import { toast } from "sonner";

/**
 * Optional shortcut on the login page. Only renders if the browser
 * supports WebAuthn — otherwise hidden so users on older browsers see
 * just the password form.
 */
export function PasskeyLoginButton() {
  const router = useRouter();
  const params = useSearchParams();
  // `null` = haven't checked yet (server-render + first paint).
  // We always render the divider to prevent layout shift when hydration
  // finishes; the button itself only appears once we know the API works.
  const [supported, setSupported] = useState<boolean | null>(null);
  // Separate state so we can distinguish "no API at all" (old browser) from
  // "API exists but blocked because we're on plain HTTP" — the second case
  // is by far the most common in dev/staging and deserves a visible hint
  // rather than a silent absence.
  const [insecure, setInsecure] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hasApi = typeof window.PublicKeyCredential !== "undefined";
    const secure = window.isSecureContext;
    setSupported(hasApi);
    setInsecure(!secure);
  }, []);

  if (supported === null) return null;
  // Browser without WebAuthn AND we're on a secure context — truly
  // unsupported (rare, e.g. some embedded webviews). Hide silently.
  if (!supported && !insecure) return null;

  async function handle() {
    setBusy(true);
    try {
      // Step 1: ask the server for an authentication challenge.
      const beginRes = await fetch("/api/passkeys/auth/begin", {
        method: "POST",
      });
      const beginBody = await beginRes.json();
      if (!beginRes.ok || !beginBody?.success) {
        toast.error(beginBody?.error ?? "Couldn't start passkey login");
        return;
      }

      // Step 2: ask the browser to present the user's passkeys. The
      // browser shows a system UI ("Use your fingerprint to sign in").
      const { startAuthentication } = await import("@simplewebauthn/browser");
      let response;
      try {
        // v9: pass options directly, not wrapped in { optionsJSON }.
        response = await startAuthentication(beginBody.data.options);
      } catch (e) {
        const msg = (e as Error).message ?? "";
        if (msg.includes("cancelled") || msg.includes("aborted")) {
          // User dismissed the prompt — silent, no toast noise.
          return;
        }
        toast.error(msg || "Authenticator refused");
        return;
      }

      // Step 3: hand the assertion to NextAuth via our `passkey`
      // Credentials provider, which verifies signature + creates session.
      const callbackUrl = (() => {
        const raw = params.get("callbackUrl");
        if (!raw || !raw.startsWith("/") || raw.startsWith("//")) {
          return "/dashboard";
        }
        return raw;
      })();

      const res = await signIn("passkey", {
        sessionToken: beginBody.data.sessionToken,
        response: JSON.stringify(response),
        redirect: false,
      });

      if (!res || res.error) {
        const code = (res?.code ?? "") + " " + (res?.error ?? "");
        if (code.includes("expired")) {
          toast.error("Login expired. Try again.");
        } else if (code.includes("not available")) {
          toast.error(
            "Account is deactivated or unverified. Use password sign-in for next steps.",
          );
        } else {
          toast.error(
            "Passkey didn't match. Use password sign-in or add a new passkey on this device.",
          );
        }
        return;
      }

      router.push(callbackUrl);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  // Insecure context (HTTP). Render a disabled, explanatory button instead
  // of hiding — owners need to know their HTTPS isn't set up yet.
  if (insecure) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.05 }}
        className="space-y-3"
      >
        <div
          className="flex w-full items-start gap-2.5 rounded-lg border border-amber-300/60 bg-amber-50/70 px-4 py-3 text-left dark:border-amber-400/30 dark:bg-amber-950/30"
          role="note"
        >
          <Fingerprint className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" />
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-amber-900 dark:text-amber-100">
              Passkey login needs HTTPS
            </div>
            <div className="mt-0.5 text-[11px] leading-snug text-amber-800/80 dark:text-amber-200/80">
              Browsers only allow fingerprint / Face ID on secure (https://) origins.
              Attach a domain with SSL to enable this.
            </div>
          </div>
        </div>
        <div className="relative flex items-center">
          <div className="flex-1 border-t" />
          <span className="px-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            sign in with password
          </span>
          <div className="flex-1 border-t" />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.05 }}
      className="space-y-3"
    >
      <button
        type="button"
        onClick={handle}
        disabled={busy}
        className="group relative flex w-full items-center justify-center gap-2 rounded-lg border-2 border-primary/30 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary transition hover:border-primary/60 hover:bg-primary/10 disabled:opacity-60"
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Fingerprint className="h-4 w-4" />
        )}
        {busy ? "Waiting for device..." : "Sign in with passkey"}
      </button>
      <div className="relative flex items-center">
        <div className="flex-1 border-t" />
        <span className="px-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          or use password
        </span>
        <div className="flex-1 border-t" />
      </div>
    </motion.div>
  );
}
