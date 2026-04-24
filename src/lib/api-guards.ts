import { NextResponse } from "next/server";
import type { Session } from "next-auth";
import type { Role } from "@prisma/client";
import { auth } from "@/auth";
import { canAny } from "@/lib/permissions";

/**
 * Shared API route guard. Returns either the authenticated session (if
 * the user is allowed) or a pre-built 401/403 NextResponse the caller
 * should early-return.
 *
 * Why a single helper: every route was re-implementing the auth +
 * role-check dance slightly differently (or not at all). Centralising
 * makes it impossible to forget a role gate and keeps error shapes
 * consistent.
 *
 * Usage:
 *   const gate = await requireApiRole(["OWNER", "ADMIN"]);
 *   if (gate instanceof NextResponse) return gate;
 *   const session = gate;
 */
export async function requireApiRole(
  allowed: Role[],
): Promise<NextResponse | Session> {
  // NextAuth v5 `auth()` has overloaded signatures (middleware-wrapper
  // vs. session-fetch); ReturnType picks the first overload, so we assert
  // the session shape explicitly.
  const session = (await auth()) as Session | null;
  if (!session?.user?.clinicId) {
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 },
    );
  }
  if (!canAny(session.user.role, allowed)) {
    return NextResponse.json(
      {
        success: false,
        error: `${humanRole(session.user.role)} cannot perform this action`,
      },
      { status: 403 },
    );
  }
  return session;
}

/** Allow the user without a clinicId (e.g. SUPER_ADMIN) to pass. */
export async function requireApiRoleAllowPlatform(
  allowed: Role[],
): Promise<NextResponse | Session> {
  const session = (await auth()) as Session | null;
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 },
    );
  }
  if (!canAny(session.user.role, allowed)) {
    return NextResponse.json(
      {
        success: false,
        error: `${humanRole(session.user.role)} cannot perform this action`,
      },
      { status: 403 },
    );
  }
  return session;
}

function humanRole(role: string): string {
  return role
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}
