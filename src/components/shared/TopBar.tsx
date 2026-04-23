import { auth, signOut } from "@/auth";
import { MobileSidebar } from "./MobileSidebar";
import { UserMenu } from "./UserMenu";
import { ThemeToggle } from "./ThemeToggle";
import { NotificationBell } from "./NotificationBell";
import { SidebarCollapseToggle } from "./SidebarCollapseToggle";
import { SidebarUser } from "./SidebarUser";
import { MobilePageTitle } from "./MobilePageTitle";
import type { ModuleFlag } from "@/lib/permissions";

export async function TopBar({
  clinicName,
  enabledModules,
}: {
  clinicName?: string;
  enabledModules?: Partial<Record<ModuleFlag, boolean>>;
}) {
  const session = await auth();
  if (!session?.user) return null;

  return (
    <header
      className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b bg-background/85 px-3 pt-[max(env(safe-area-inset-top),0px)] backdrop-blur-md sm:h-16 sm:gap-3 sm:px-6"
    >
      <MobileSidebar
        role={session.user.role}
        clinicName={clinicName}
        enabledModules={enabledModules}
        userSlot={<SidebarUser />}
      />
      <SidebarCollapseToggle />

      <div className="flex min-w-0 flex-1 items-center gap-3">
        {/* Mobile: contextual page title. Desktop: nothing here (sidebar shows name). */}
        <div className="min-w-0 flex-1 truncate lg:hidden">
          <MobilePageTitle />
        </div>
      </div>

      <div className="flex items-center gap-0.5 sm:gap-1">
        <NotificationBell />
        <ThemeToggle />
        <UserMenu
          name={session.user.name ?? ""}
          email={session.user.email ?? ""}
          role={session.user.role}
          signOut={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        />
      </div>
    </header>
  );
}
