import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import type { Session } from "next-auth";
import { auth, ROLE_HOME } from "@/auth";

/**
 * Narrowed session shape returned by {@link requireRole}. The base session
 * types `clinicId` as `string | null`; after this guard we know the user is
 * attached to a clinic, so callers can use `session.user.clinicId` directly.
 */
export type RoleGatedSession = Session & {
  user: Session["user"] & { clinicId: string };
};

/**
 * Server component / server action guard.
 * If the session's role isn't in the allowed list, redirect to that role's
 * home with ?denied=<path>&role=<role> so the AccessDeniedToast fires.
 */
export async function requireRole(
  allowed: Role[],
  forPath: string,
): Promise<RoleGatedSession> {
  const session = await auth();
  if (!session?.user?.clinicId) {
    redirect(`/login?callbackUrl=${encodeURIComponent(forPath)}`);
  }
  if (!allowed.includes(session.user.role)) {
    const home = ROLE_HOME[session.user.role] ?? "/dashboard";
    const url = new URL(home, "http://placeholder");
    url.searchParams.set("denied", forPath);
    url.searchParams.set("role", session.user.role);
    redirect(url.pathname + "?" + url.searchParams.toString());
  }
  return session as RoleGatedSession;
}
