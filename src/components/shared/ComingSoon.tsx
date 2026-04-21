import { Construction } from "lucide-react";

export function ComingSoon({
  title,
  description,
  step,
}: {
  title: string;
  description?: string;
  step?: string;
}) {
  return (
    <div className="mx-auto max-w-md rounded-xl border border-dashed bg-card p-10 text-center">
      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Construction className="h-5 w-5" />
      </div>
      <h2 className="text-base font-semibold">{title}</h2>
      {description && (
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      )}
      {step && (
        <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-[11px] font-medium text-muted-foreground">
          Build order: {step}
        </div>
      )}
    </div>
  );
}
