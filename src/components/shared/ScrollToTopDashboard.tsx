"use client";

import { useEffect, useState } from "react";
import { ScrollToTop } from "./ScrollToTop";

/**
 * Wraps ScrollToTop with a responsive bottom offset: on mobile we lift
 * it above the 68px bottom nav; on desktop there's no nav so 0 offset.
 */
export function ScrollToTopDashboard() {
  const [bottomOffset, setBottomOffset] = useState(72);

  useEffect(() => {
    function update() {
      // Tailwind's lg breakpoint = 1024px
      setBottomOffset(window.innerWidth >= 1024 ? 0 : 72);
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return <ScrollToTop bottomOffset={bottomOffset} />;
}
