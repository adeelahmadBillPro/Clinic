import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { loginSchema } from "@/lib/validations/auth";
import { authConfig } from "./auth.config";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

/**
 * Extend NextAuth v5's `CredentialsSignin` so `res.code` surfaces our
 * specific reason on the client (`LoginForm` reads `res.code` to show
 * "Please verify your email" vs "Invalid email or password" vs
 * "Account locked"). A generic `Error` would just come through as
 * `code: "credentials"` and every reason would look the same.
 */
export class AuthError extends CredentialsSignin {
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
    // Passkey (WebAuthn) — biometric / hardware-key login. Verifies the
    // browser-returned assertion against the public key we stored when
    // the user first registered the passkey. No password needed; only
    // works for users who explicitly added a passkey from /profile.
    //
    // Surface in NextAuth as a second Credentials provider so the JWT +
    // session pipeline is identical to password login.
    Credentials({
      id: "passkey",
      name: "Passkey",
      credentials: {
        sessionToken: {},
        response: {},
      },
      async authorize(raw) {
        const sessionToken = (raw as { sessionToken?: string })?.sessionToken;
        const responseStr = (raw as { response?: string })?.response;
        if (!sessionToken || !responseStr) {
          throw new AuthError("INVALID_INPUT", "Missing passkey response");
        }
        let response;
        try {
          response = JSON.parse(responseStr);
        } catch {
          throw new AuthError("INVALID_INPUT", "Malformed passkey response");
        }

        // Lazy-import the heavy WebAuthn deps so the password path stays fast.
        const { verifyAuthenticationResponse } = await import(
          "@simplewebauthn/server"
        );
        const { consumeChallenge, getRpConfig } = await import(
          "@/lib/webauthn"
        );

        const expectedChallenge = consumeChallenge(`auth:${sessionToken}`);
        if (!expectedChallenge) {
          throw new AuthError(
            "INVALID_CREDENTIALS",
            "Login challenge expired. Try again.",
          );
        }

        // Resolve the credential id from the assertion → look up which
        // user it belongs to. Discoverable-credential flow: the browser
        // tells us which credential was used.
        const credentialId = response?.id;
        if (!credentialId || typeof credentialId !== "string") {
          throw new AuthError("INVALID_CREDENTIALS", "Invalid passkey");
        }
        const passkey = await prisma.passkey.findUnique({
          where: { credentialId },
          select: {
            id: true,
            credentialId: true,
            publicKey: true,
            counter: true,
            transports: true,
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                role: true,
                clinicId: true,
                isActive: true,
                emailVerifiedAt: true,
              },
            },
          },
        });
        if (!passkey) {
          throw new AuthError(
            "INVALID_CREDENTIALS",
            "Unknown passkey",
          );
        }
        if (!passkey.user.isActive || !passkey.user.emailVerifiedAt) {
          // Same constraints as password login — deactivated /
          // unverified users can't passkey-login either.
          throw new AuthError(
            "INVALID_CREDENTIALS",
            "Account not available",
          );
        }

        const { rpID, origin } = getRpConfig();

        let verification;
        try {
          verification = await verifyAuthenticationResponse({
            response,
            expectedChallenge,
            expectedOrigin: origin,
            expectedRPID: rpID,
            // v9 API: `authenticator` not `credential`.
            authenticator: {
              credentialID: Buffer.from(passkey.credentialId, "base64url"),
              credentialPublicKey: Buffer.from(
                passkey.publicKey,
                "base64url",
              ),
              counter: Number(passkey.counter),
              transports: passkey.transports
                ? (passkey.transports.split(",") as (
                    | "ble"
                    | "cable"
                    | "hybrid"
                    | "internal"
                    | "nfc"
                    | "smart-card"
                    | "usb"
                  )[])
                : undefined,
            },
            requireUserVerification: false,
          });
        } catch (e) {
          throw new AuthError(
            "INVALID_CREDENTIALS",
            (e as Error).message ?? "Passkey verification failed",
          );
        }

        if (!verification.verified) {
          throw new AuthError("INVALID_CREDENTIALS", "Passkey not verified");
        }

        // Bump the counter (anti-replay) + lastUsed.
        await prisma.passkey.update({
          where: { id: passkey.id },
          data: {
            counter: BigInt(verification.authenticationInfo.newCounter),
            lastUsedAt: new Date(),
          },
        });

        // Reset failed attempts + bump lastLoginAt, mirroring password path.
        await prisma.user.update({
          where: { id: passkey.user.id },
          data: {
            failedLoginAttempts: 0,
            lockedUntil: null,
            lastLoginAt: new Date(),
          },
        });

        return {
          id: passkey.user.id,
          email: passkey.user.email,
          name: passkey.user.name,
          role: passkey.user.role,
          clinicId: passkey.user.clinicId,
        };
      },
    }),
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
        // Don't leak existence — user-not-found and user-deactivated both
        // get the generic message. But "exists + correct password +
        // unverified" gets the specific verification prompt so a freshly
        // registered user understands why they can't sign in yet.
        if (!user) {
          throw new AuthError(
            "INVALID_CREDENTIALS",
            "Invalid email or password",
          );
        }
        if (!user.emailVerifiedAt) {
          // Note: we check this before isActive specifically because a
          // freshly registered user has isActive=false until verified.
          // Falling through to the isActive check would surface the
          // generic "Invalid email or password" instead of the helpful
          // "verify your email" prompt.
          throw new AuthError(
            "EMAIL_NOT_VERIFIED",
            "Please verify your email first. Check your inbox for the link.",
          );
        }
        if (!user.isActive) {
          throw new AuthError(
            "INVALID_CREDENTIALS",
            "Invalid email or password",
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
