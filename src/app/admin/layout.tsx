import { redirect } from "next/navigation";
import Link from "next/link";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Logo } from "@/components/shared/Logo";
import { Button } from "@/components/ui/button";
import { ShieldCheck, LayoutDashboard, Building2, Inbox, LogOut } from "lucide-react";
import { Suspense } from "react";
import { AccessDeniedToast } from "@/components/shared/AccessDeniedToast";

export const metadata = { title: "Super Admin — ClinicOS" };

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/admin");
  if (session.user.role !== "SUPER_ADMIN") {
    const home = "/dashboard?denied=/admin&role=" + session.user.role;
    redirect(home);
  }

  const pendingCount = await prisma.upgradeRequest.count({
    where: { status: "PENDING" },
  });

  return (
    <div className="flex min-h-dvh bg-muted/30">
      <aside className="hidden w-64 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground lg:sticky lg:top-0 lg:flex lg:h-dvh">
        <div className="flex h-16 items-center gap-2 border-b px-5">
          <Logo />
        </div>
        <div className="border-b px-5 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-primary">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Platform
              </div>
              <div className="text-sm font-medium">Super Admin</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto p-3">
          <AdminNavItem href="/admin" icon={<LayoutDashboard className="h-4 w-4" />}>
            Overview
          </AdminNavItem>
          <AdminNavItem href="/admin/clinics" icon={<Building2 className="h-4 w-4" />}>
            Clinics
          </AdminNavItem>
          <AdminNavItem
            href="/admin/upgrades"
            icon={<Inbox className="h-4 w-4" />}
            badge={pendingCount > 0 ? pendingCount : undefined}
          >
            Upgrade requests
          </AdminNavItem>
        </nav>
        <div className="border-t p-3">
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              className="w-full justify-start"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </Button>
          </form>
          <div className="mt-2 px-2 text-[11px] text-muted-foreground">
            Signed in as{" "}
            <span className="font-medium text-foreground">
              {session.user.email}
            </span>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b bg-background/85 px-4 backdrop-blur-md sm:px-6 lg:hidden">
          <Logo />
          <span className="text-sm font-semibold">Super Admin</span>
          <div className="ml-auto flex items-center gap-1">
            <Link
              href="/admin/upgrades"
              className="relative inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-accent"
            >
              <Inbox className="h-4 w-4" />
              {pendingCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 rounded-full bg-destructive px-1.5 text-[10px] font-semibold text-destructive-foreground">
                  {pendingCount}
                </span>
              )}
            </Link>
          </div>
        </header>
        <main className="flex-1 overflow-x-hidden px-4 pb-10 pt-6 sm:px-6">
          <Suspense fallback={null}>
            <AccessDeniedToast />
          </Suspense>
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}

function AdminNavItem({
  href,
  icon,
  children,
  badge,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      className="group relative mb-1 flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
    >
      {icon}
      <span className="flex-1">{children}</span>
      {badge !== undefined && (
        <span className="rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-semibold text-destructive-foreground">
          {badge}
        </span>
      )}
    </Link>
  );
}
