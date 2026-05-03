import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/shared/Sidebar";
import { MobileBottomNav } from "@/components/shared/MobileBottomNav";
import { TopBar } from "@/components/shared/TopBar";
import { TrialBanner } from "@/components/shared/TrialBanner";
import { SidebarUser } from "@/components/shared/SidebarUser";
import { AccessDeniedToast } from "@/components/shared/AccessDeniedToast";
import { ScrollToTopDashboard } from "@/components/shared/ScrollToTopDashboard";
import { InstallAppPrompt } from "@/components/shared/InstallAppPrompt";
import { Suspense } from "react";
import { cn } from "@/lib/utils";

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
    <div
      data-dashboard-shell
      className="min-h-dvh bg-muted/30 transition-[padding] duration-200 ease-out lg:pl-64"
    >
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
        <TopBar />

        <main
          className={cn(
            "flex-1 overflow-x-hidden px-3 sm:px-6",
            "pt-4 sm:pt-6",
            // Bottom nav is ~68px on mobile — pad enough + add safe-area bottom
            "pb-[calc(80px+env(safe-area-inset-bottom,0px))] lg:pb-10",
          )}
        >
          <Suspense fallback={null}>
            <AccessDeniedToast />
          </Suspense>
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>

      <MobileBottomNav
        role={session.user.role}
        clinicName={clinic?.name ?? null}
        userEmail={session.user.email ?? null}
        userName={session.user.name ?? null}
        enabledModules={moduleSettings}
        signOut={async () => {
          "use server";
          await signOut({ redirectTo: "/login" });
        }}
      />
      <ScrollToTopDashboard />
      <InstallAppPrompt />
    </div>
  );
}
