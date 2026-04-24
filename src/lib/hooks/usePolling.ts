"use client";

import { useEffect, useRef } from "react";

/**
 * Poll `load` every `intervalMs` while the tab is visible. Pauses when
 * the tab is hidden (Page Visibility API) so a dozen queue screens left
 * open overnight don't hammer the API.
 *
 * Fires `load` once on mount regardless of visibility — the initial data
 * paint is worth it.
 *
 * Consumers should wrap their `load` function in `useCallback` so we
 * don't thrash the interval on every render.
 */
export function usePolling(load: () => void, intervalMs: number): void {
  // Hold the latest `load` in a ref so interval callback always calls the
  // most recent version without restarting the interval on every render.
  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;

    const stop = () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };

    const start = () => {
      if (timer) return;
      loadRef.current();
      timer = setInterval(() => loadRef.current(), intervalMs);
    };

    const onVisibilityChange = () => {
      if (document.hidden) stop();
      else start();
    };

    start();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [intervalMs]);
}
