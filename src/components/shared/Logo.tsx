import { cn } from "@/lib/utils";

type LogoProps = {
  className?: string;
  iconOnly?: boolean;
  variant?: "default" | "light";
};

export function Logo({ className, iconOnly, variant = "default" }: LogoProps) {
  const textClass =
    variant === "light" ? "text-white" : "text-foreground";
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <LogoMark className="h-8 w-8 shrink-0" variant={variant} />
      {!iconOnly && (
        <span
          className={cn(
            "text-lg font-semibold tracking-tight",
            textClass,
          )}
        >
          ClinicOS
        </span>
      )}
    </div>
  );
}

export function LogoMark({
  className,
  variant = "default",
}: {
  className?: string;
  variant?: "default" | "light";
}) {
  const primary = variant === "light" ? "#ffffff" : "#0F6E56";
  const accent = variant === "light" ? "#A7F3D0" : "#34D399";
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <rect
        x="2"
        y="2"
        width="28"
        height="28"
        rx="8"
        fill={primary}
        fillOpacity={variant === "light" ? 0.15 : 1}
      />
      <path
        d="M12 10.5v11M21 10.5v11M12 16h9"
        stroke={variant === "light" ? primary : "#ffffff"}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="24.5" cy="10" r="2.5" fill={accent} />
    </svg>
  );
}
