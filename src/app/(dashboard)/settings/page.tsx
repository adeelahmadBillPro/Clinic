import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/require-role";
import { prisma } from "@/lib/prisma";
import { SettingsPanel } from "@/components/settings/SettingsPanel";
import { ScrollText } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Settings — ClinicOS" };

export default async function SettingsPage() {
  // P3-44: role gate
  const session = await requireRole(["OWNER", "ADMIN"], "/settings");

  const clinic = await prisma.clinic.findUnique({
    where: { id: session.user.clinicId },
  });
  if (!clinic) redirect("/login");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Clinic name, contact info, language, timezone, token reset time.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/settings/audit-log"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            <ScrollText className="mr-1.5 h-3.5 w-3.5" />
            Audit log
          </Link>
        </div>
      </div>

      <SettingsPanel
        clinic={{
          name: clinic.name,
          phone: clinic.phone,
          address: clinic.address,
          slug: clinic.slug,
          settings: (clinic.settings as Record<string, unknown>) ?? {},
        }}
      />
    </div>
  );
}
