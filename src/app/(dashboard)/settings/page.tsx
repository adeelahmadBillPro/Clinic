import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/permissions";
import { SettingsPanel } from "@/components/settings/SettingsPanel";
import { FileDown, ScrollText } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Settings — ClinicOS" };

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.clinicId) redirect("/login");
  if (!isAdmin(session.user.role)) redirect("/dashboard");

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
            Clinic branding, working configuration, and data export.
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
