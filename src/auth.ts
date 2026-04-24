import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { loginSchema } from "@/lib/validations/auth";
import { authConfig } from "./auth.config";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

export class AuthError extends Error {
  code: string;
  meta?: Record<string, unknown>;
  constructor(code: string, message: string, meta?: Record<string, unknown>) {
    super(message);
    this.code = code;
    this.meta = meta;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    // Node-side jwt callback: on every refresh (no `user` object means this
    // isn't a fresh sign-in), re-read the live User row so deactivation or
    // role changes take effect without waiting for JWT expiry.
    //
    // Returning null here invalidates the session.
    //
    // Middleware uses the edge-safe callback from authConfig — no DB hit
    // there to keep middleware fast.
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as { id?: string }).id ?? token.id;
        token.role = (user as { role?: Role }).role ?? token.role;
        token.clinicId =
          (user as { clinicId?: string | null }).clinicId ?? token.clinicId;
        return token;
      }
      if (token.id) {
        const fresh = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: {
            isActive: true,
            role: true,
            clinicId: true,
            emailVerifiedAt: true,
          },
        });
        if (!fresh || !fresh.isActive || !fresh.emailVerifiedAt) {
          return null;
        }
        token.role = fresh.role;
        token.clinicId = fresh.clinicId;
      }
      return token;
    },
  },
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      async authorize(raw) {
        const parsed = loginSchema
          .pick({ email: true, password: true })
          .safeParse(raw);
        if (!parsed.success) {
          throw new AuthError("INVALID_INPUT", "Invalid email or password");
        }
        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.isActive) {
          throw new AuthError(
            "INVALID_CREDENTIALS",
            "Invalid email or password",
          );
        }
        // Block unverified signups — prevents using a freshly registered
        // account before the verification link has been clicked.
        if (!user.emailVerifiedAt) {
          throw new AuthError(
            "EMAIL_NOT_VERIFIED",
            "Please verify your email first. Check your inbox for the link.",
          );
        }

        if (user.lockedUntil && user.lockedUntil > new Date()) {
          const minutesLeft = Math.ceil(
            (user.lockedUntil.getTime() - Date.now()) / 60000,
          );
          throw new AuthError(
            "LOCKED",
            `Account locked. Try again in ${minutesLeft} minute${minutesLeft === 1 ? "" : "s"}.`,
            { lockedUntil: user.lockedUntil.toISOString() },
          );
        }

        const valid = await verifyPassword(password, user.password);
        if (!valid) {
          const attempts = user.failedLoginAttempts + 1;
          const shouldLock = attempts >= MAX_FAILED_ATTEMPTS;
          await prisma.user.update({
            where: { id: user.id },
            data: {
              failedLoginAttempts: shouldLock ? 0 : attempts,
              lockedUntil: shouldLock
                ? new Date(Date.now() + LOCKOUT_MINUTES * 60_000)
                : null,
            },
          });
          if (shouldLock) {
            throw new AuthError(
              "LOCKED",
              `Too many failed attempts. Account locked for ${LOCKOUT_MINUTES} minutes.`,
            );
          }
          throw new AuthError(
            "INVALID_CREDENTIALS",
            `Invalid email or password. ${MAX_FAILED_ATTEMPTS - attempts} attempt${MAX_FAILED_ATTEMPTS - attempts === 1 ? "" : "s"} remaining.`,
          );
        }

        await prisma.user.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: 0,
            lockedUntil: null,
            lastLoginAt: new Date(),
          },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          clinicId: user.clinicId,
        };
      },
    }),
  ],
});

export const ROLE_HOME: Record<Role, string> = {
  SUPER_ADMIN: "/admin",
  OWNER: "/dashboard",
  ADMIN: "/dashboard",
  DOCTOR: "/doctor",
  RECEPTIONIST: "/reception",
  NURSE: "/ipd",
  PHARMACIST: "/pharmacy",
  LAB_TECH: "/lab",
};
