"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import {
  CircleCheckIcon,
  InfoIcon,
  TriangleAlertIcon,
  OctagonXIcon,
  Loader2Icon,
} from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      toastOptions={{
        unstyled: false,
        classNames: {
          toast:
            "group rounded-xl border shadow-md ring-1 ring-inset backdrop-blur-sm py-3 px-4",
          title: "text-sm font-semibold",
          description: "text-xs",
          closeButton:
            "!bg-white/70 !border !text-foreground/60 hover:!text-foreground transition",
          actionButton:
            "!bg-primary !text-primary-foreground !rounded-md !px-3 !py-1 !text-xs !font-medium hover:!brightness-95",
          cancelButton:
            "!bg-transparent !text-foreground/70 hover:!text-foreground !text-xs",
          // Per-type pastel backgrounds matching the ClinicOS mint palette
          success:
            "!bg-accent/70 !text-emerald-900 !border-emerald-500/20 !ring-white/60",
          error:
            "!bg-red-50 !text-red-900 !border-red-400/30 !ring-white/60 dark:!bg-red-950/40 dark:!text-red-100",
          warning:
            "!bg-amber-50 !text-amber-900 !border-amber-400/30 !ring-white/60 dark:!bg-amber-950/40 dark:!text-amber-100",
          info:
            "!bg-sky-50 !text-sky-900 !border-sky-400/30 !ring-white/60 dark:!bg-sky-950/40 dark:!text-sky-100",
          loading:
            "!bg-muted/70 !text-foreground !border-border !ring-white/60",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
