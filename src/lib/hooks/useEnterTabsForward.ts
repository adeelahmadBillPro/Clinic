"use client";

import { useCallback } from "react";

/**
 * Make Enter advance to the next form field instead of submitting,
 * UNTIL the user reaches the last input — then Enter submits as
 * normal. Big productivity win for receptionists / nurses entering
 * dozens of records per shift; matches what they expect from desktop
 * patient-management software.
 *
 * Usage:
 *   const handleEnterTab = useEnterTabsForward();
 *   <form onSubmit={...} onKeyDown={handleEnterTab}> ... </form>
 *
 * Skips:
 *   - Textareas (Enter = newline; intended)
 *   - Buttons (Enter = click; the user is intentionally pressing the
 *     submit / cancel)
 *   - Anything with `data-enter-skip="true"` (escape hatch for custom
 *     widgets like TagInput where Enter has its own meaning)
 *
 * If a child component handles Enter itself and calls
 * `event.stopPropagation()`, the form-level handler never fires —
 * which is exactly what we want.
 */
export function useEnterTabsForward() {
  // Accept any HTMLElement so we can wire this to plain divs too — many
  // forms in this app aren't wrapped in a real <form> element.
  return useCallback((e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key !== "Enter") return;
    if (e.shiftKey || e.ctrlKey || e.metaKey || e.altKey) return;

    const target = e.target as HTMLElement | null;
    if (!target) return;

    const tag = target.tagName;
    if (tag === "TEXTAREA" || tag === "BUTTON") return;
    if (target.closest("[data-enter-skip='true']")) return;

    const form = e.currentTarget;
    const focusables = Array.from(
      form.querySelectorAll<HTMLElement>(
        [
          "input:not([type='hidden']):not([disabled]):not([readonly])",
          "select:not([disabled])",
          "[data-enter-tabs='true']",
        ].join(", "),
      ),
    ).filter((el) => {
      if (el.getAttribute("aria-hidden") === "true") return false;
      if (el.tabIndex < 0) return false;
      // Skip submit/reset buttons even if they slip through.
      if (el instanceof HTMLInputElement && el.type === "submit") return false;
      return true;
    });

    const idx = focusables.indexOf(target as HTMLElement);
    if (idx === -1) return;
    // Last field → let Enter submit normally.
    if (idx >= focusables.length - 1) return;

    e.preventDefault();
    const next = focusables[idx + 1];
    next.focus();
    // Pre-select existing content so the user can immediately overwrite.
    if (
      next instanceof HTMLInputElement &&
      ["text", "email", "tel", "number", "url", "search", "password"].includes(
        next.type,
      )
    ) {
      try {
        next.select();
      } catch {
        // Some inputs (e.g. type=number on certain browsers) reject .select().
      }
    }
  }, []);
}
