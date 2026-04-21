import { auth, signOut } from "@/auth";
import { MobileSidebar } from "./MobileSidebar";
import { UserMenu } from "./UserMenu";
import { ThemeToggle } from "./ThemeToggle";
import { NotificationBell } from "./NotificationBell";
import { SidebarCollapseToggle } from "./SidebarCollapseToggle";

export async function TopBar({ clinicName }: { clinicName?: string }) {
  const session = await auth();
  if (!session?.user) return null;

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b bg-background/85 px-4 backdrop-blur-md sm:px-6">
      <MobileSidebar role={session.user.role} clinicName={clinicName} />
      <SidebarCollapseToggle />

      <div className="flex flex-1 items-center gap-3">
        <div className="lg:hidden">
          <div className="text-sm font-semibold tracking-tight">ClinicOS</div>
        </div>
      </div>

      <div className="flex items-center gap-1">
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
