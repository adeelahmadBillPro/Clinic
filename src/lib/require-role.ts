import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { auth, ROLE_HOME } from "@/auth";

/**
 * Server component / server action guard.
 * If the session's role isn't in the allowed list, redirect to that role's
 * home with ?denied=<path>&role=<role> so the AccessDeniedToast fires.
 */
export async function requireRole(allowed: Role[], forPath: string) {
  const session = await auth();
  if (!session?.user) {
    redirect(`/login?callbackUrl=${encodeURIComponent(forPath)}`);
  }
  if (!allowed.includes(session.user.role)) {
    const home = ROLE_HOME[session.user.role] ?? "/dashboard";
    const url = new URL(home, "http://placeholder");
    url.searchParams.set("denied", forPath);
    url.searchParams.set("role", session.user.role);
    redirect(url.pathname + "?" + url.searchParams.toString());
  }
  return session;
}
