import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/shared/Sidebar";
import { MobileBottomNav } from "@/components/shared/MobileBottomNav";
import { TopBar } from "@/components/shared/TopBar";
import { TrialBanner } from "@/components/shared/TrialBanner";
import { SidebarUser } from "@/components/shared/SidebarUser";
import { AccessDeniedToast } from "@/components/shared/AccessDeniedToast";
import { Suspense } from "react";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const clinic = session.user.clinicId
    ? await prisma.clinic.findUnique({
        where: { id: session.user.clinicId },
        select: { name: true, trialEndsAt: true, settings: true },
      })
    : null;

  const subscription = session.user.clinicId
    ? await prisma.subscription.findUnique({
        where: { clinicId: session.user.clinicId },
        select: { status: true },
      })
    : null;

  const moduleSettings =
    (clinic?.settings as { modules?: Record<string, boolean> } | null)
      ?.modules ?? {};

  return (
    <div className="flex min-h-dvh bg-muted/30">
      <Sidebar
        role={session.user.role}
        clinicName={clinic?.name}
        userSlot={<SidebarUser />}
        enabledModules={moduleSettings}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <TrialBanner
          trialEndsAt={clinic?.trialEndsAt ?? null}
          status={subscription?.status}
        />
        <TopBar clinicName={clinic?.name} />

        <main className="flex-1 overflow-x-hidden px-4 pb-24 pt-6 sm:px-6 lg:pb-10">
          <Suspense fallback={null}>
            <AccessDeniedToast />
          </Suspense>
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>

      <MobileBottomNav role={session.user.role} />
    </div>
  );
}
