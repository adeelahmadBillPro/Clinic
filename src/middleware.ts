import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";

const { auth } = NextAuth(authConfig);

const PUBLIC_PATHS = new Set([
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
]);

function isPublic(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  if (pathname.startsWith("/book/")) return true;
  if (pathname.startsWith("/review/")) return true;
  if (pathname.startsWith("/_next")) return true;
  if (pathname.startsWith("/api/auth")) return true;
  if (pathname.startsWith("/api/register")) return true;
  if (pathname.startsWith("/api/forgot-password")) return true;
  if (pathname.startsWith("/api/reset-password")) return true;
  if (pathname.startsWith("/api/reviews")) return true;
  if (pathname.startsWith("/api/doctors/") && pathname.endsWith("/reviews")) return true;
  return false;
}

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const user = req.auth?.user;
  const isAuthed = !!user;

  if (isAuthed && (pathname === "/login" || pathname === "/register")) {
    const home = user!.role === "SUPER_ADMIN" ? "/admin" : "/dashboard";
    return NextResponse.redirect(new URL(home, req.url));
  }

  if (!isAuthed && !isPublic(pathname)) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Strict role gate for /admin (super admin only)
  if (isAuthed && pathname.startsWith("/admin")) {
    if (user!.role !== "SUPER_ADMIN") {
      const home = new URL("/dashboard", req.url);
      home.searchParams.set("denied", pathname);
      home.searchParams.set("role", user!.role);
      return NextResponse.redirect(home);
    }
  }

  // Super admin should not wander into tenant dashboards
  if (isAuthed && user!.role === "SUPER_ADMIN" && !pathname.startsWith("/admin")) {
    if (pathname === "/dashboard" || pathname === "/profile" || pathname === "/help") {
      // Allow profile + help for super admin; block everything else
    } else if (
      pathname.startsWith("/dashboard") ||
      pathname.startsWith("/doctor") ||
      pathname.startsWith("/reception") ||
      pathname.startsWith("/pharmacy") ||
      pathname.startsWith("/ipd") ||
      pathname.startsWith("/lab") ||
      pathname.startsWith("/patients") ||
      pathname.startsWith("/staff") ||
      pathname.startsWith("/billing") ||
      pathname.startsWith("/appointments") ||
      pathname.startsWith("/settings") ||
      pathname.startsWith("/subscription") ||
      pathname.startsWith("/inventory") ||
      pathname.startsWith("/analytics")
    ) {
      return NextResponse.redirect(new URL("/admin", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.).*)"],
};
