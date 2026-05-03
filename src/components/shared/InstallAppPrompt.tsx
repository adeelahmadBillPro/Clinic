"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X, Smartphone, Lock } from "lucide-react";

const DISMISS_KEY = "clinicos:install-dismissed-at";
// Re-show prompt after 7 days if user dismissed (don't be nagging).
const REMIND_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type Mode = "android-install" | "ios-hint" | "needs-https";

/**
 * "Install app" banner shown to mobile users who haven't installed yet.
 *
 * Three modes:
 * 1. android-install — `beforeinstallprompt` fired (HTTPS Chrome / Edge):
 *    show real "Install now" button that triggers the native dialog.
 * 2. ios-hint — iOS Safari on HTTPS: no programmatic API, render manual
 *    "Tap Share → Add to Home Screen" instructions.
 * 3. needs-https — site is on plain HTTP: install simply won't work in
 *    any browser (PWA spec requires a secure context). Tell the user
 *    truthfully so they don't keep tapping a dead button.
 *
 * Auto-hides if:
 * - already running standalone (display-mode: standalone)
 * - user dismissed within last 7 days
 * - desktop browser (only valuable on phones)
 */
export function InstallAppPrompt() {
  const [installEvent, setInstallEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [mode, setMode] = useState<Mode | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Already installed → don't bug them.
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // iOS Safari sets navigator.standalone instead of display-mode.
      (window.navigator as Navigator & { standalone?: boolean }).standalone ===
        true;
    if (standalone) return;

    // User dismissed recently?
    try {
      const t = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
      if (t && Date.now() - t < REMIND_AFTER_MS) return;
    } catch {
      // ignore — localStorage blocked, just show the prompt
    }

    // Touch-only check — no point nagging desktop laptops.
    const isMobile =
      window.matchMedia("(max-width: 768px)").matches ||
      "ontouchstart" in window;
    if (!isMobile) return;

    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isSafari =
      /safari/i.test(navigator.userAgent) &&
      !/crios|fxios/i.test(navigator.userAgent);

    // No HTTPS → install will not work, period. Show an honest hint
    // (with no fake install button) after a short delay.
    if (!window.isSecureContext) {
      const t = setTimeout(() => {
        setMode("needs-https");
        setVisible(true);
      }, 4000);
      return () => clearTimeout(t);
    }

    if (isIos && isSafari) {
      const t = setTimeout(() => {
        setMode("ios-hint");
        setVisible(true);
      }, 4000);
      return () => clearTimeout(t);
    }

    function onBeforeInstall(e: Event) {
      // Stop Chrome's default mini-infobar — we present our own.
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
      setMode("android-install");
      setVisible(true);
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
    };
  }, []);

  function dismiss() {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // ignore
    }
  }

  async function install() {
    if (!installEvent) return;
    try {
      await installEvent.prompt();
      const choice = await installEvent.userChoice;
      if (choice.outcome === "accepted") {
        setVisible(false);
      } else {
        dismiss();
      }
    } catch {
      dismiss();
    }
    setInstallEvent(null);
  }

  const isHttpsWarning = mode === "needs-https";

  return (
    <AnimatePresence>
      {visible && mode && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          // Above the bottom nav (~80px) with safe-area inset for the
          // iPhone home-bar.
          className={
            "fixed inset-x-3 z-50 rounded-2xl border p-3.5 shadow-xl backdrop-blur-md sm:hidden " +
            (isHttpsWarning
              ? "border-amber-300/60 bg-amber-50/95 dark:border-amber-400/30 dark:bg-amber-950/80"
              : "bg-card")
          }
          style={{
            bottom: `calc(80px + env(safe-area-inset-bottom, 0px) + 0.5rem)`,
          }}
          role="dialog"
          aria-label="Install ClinicOS"
        >
          <div className="flex items-start gap-3">
            <div
              className={
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl " +
                (isHttpsWarning
                  ? "bg-amber-200/60 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200"
                  : "bg-primary/15 text-primary")
              }
            >
              {isHttpsWarning ? (
                <Lock className="h-5 w-5" />
              ) : (
                <Smartphone className="h-5 w-5" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              {mode === "android-install" && (
                <>
                  <div className="text-sm font-semibold">Install ClinicOS</div>
                  <p className="mt-0.5 text-[11.5px] leading-snug text-muted-foreground">
                    One tap, no app store. Faster load, full-screen, like a
                    native app.
                  </p>
                  <button
                    onClick={install}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition active:scale-95"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Install now
                  </button>
                </>
              )}

              {mode === "ios-hint" && (
                <>
                  <div className="text-sm font-semibold">Install ClinicOS</div>
                  <p className="mt-0.5 text-[11.5px] leading-snug text-muted-foreground">
                    Tap{" "}
                    <span className="inline-flex items-center gap-0.5 font-medium text-foreground">
                      Share
                    </span>{" "}
                    →{" "}
                    <span className="font-medium text-foreground">
                      Add to Home Screen
                    </span>{" "}
                    for a faster, full-screen app.
                  </p>
                </>
              )}

              {mode === "needs-https" && (
                <>
                  <div className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                    Install needs HTTPS
                  </div>
                  <p className="mt-0.5 text-[11.5px] leading-snug text-amber-800/90 dark:text-amber-200/85">
                    Browsers only allow installing as a native-style app on
                    secure (https://) domains. Attach a domain with SSL to
                    enable the install prompt and offline support.
                  </p>
                </>
              )}
            </div>
            <button
              type="button"
              onClick={dismiss}
              aria-label="Dismiss"
              className={
                "-mr-1 -mt-1 rounded-full p-1.5 transition " +
                (isHttpsWarning
                  ? "text-amber-700/80 hover:bg-amber-200/40 dark:text-amber-300/80 dark:hover:bg-amber-800/40"
                  : "text-muted-foreground hover:bg-muted")
              }
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
