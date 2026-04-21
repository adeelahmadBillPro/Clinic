import { auth, signOut } from "@/auth";
import type { Role } from "@prisma/client";
import { LogOut } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

function initialsOf(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

function roleLabel(role: Role) {
  return role
    .toLowerCase()
    .split("_")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

export async function SidebarUser() {
  const session = await auth();
  if (!session?.user) return null;

  return (
    <div className="border-t p-3">
      <div className="flex items-center gap-2.5 rounded-lg bg-sidebar-accent/40 px-2.5 py-2">
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarFallback className="bg-primary/15 text-primary text-[11px] font-semibold">
            {initialsOf(session.user.name ?? "")}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-medium">
            {session.user.name}
          </div>
          <div className="truncate text-[10px] text-muted-foreground">
            {roleLabel(session.user.role)}
          </div>
        </div>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <Button
            type="submit"
            variant="ghost"
            size="icon-sm"
            aria-label="Sign out"
            title="Sign out"
            className="shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="h-3.5 w-3.5" />
          </Button>
        </form>
      </div>
    </div>
  );
}
