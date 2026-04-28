"use client";

import { HelpCircle } from "lucide-react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * Inline `?` icon next to form labels. On hover/tap it shows a short
 * explanation. Demo-grade pattern: any user-facing label that needed a
 * helper paragraph below can use this instead and stay compact.
 *
 * The underlying base-ui Tooltip handles touch via long-press out of the
 * box, so the same component works for keyboard, mouse, and touch users.
 */
export function FieldHelp({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider delay={150}>
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              type="button"
              tabIndex={-1}
              aria-label="More info"
              className="ml-1 inline-flex h-3.5 w-3.5 cursor-help items-center justify-center rounded-full align-middle text-muted-foreground/70 transition hover:text-foreground"
            >
              <HelpCircle className="h-3.5 w-3.5" />
            </button>
          }
        />
        <TooltipContent
          side="top"
          align="start"
          className="max-w-xs whitespace-normal text-xs leading-relaxed"
        >
          {children}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
