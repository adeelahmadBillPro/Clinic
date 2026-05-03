import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
import type { RegistrationResponseJSON } from "@simplewebauthn/types";
import { consumeChallenge, getRpConfig } from "@/lib/webauthn";
import { z } from "zod";

const schema = z.object({
  // The browser-returned attestation object (passed straight through).
  // Schema is defined by the WebAuthn spec; we trust @simplewebauthn to validate.
  response: z.unknown(),
  deviceName: z.string().trim().max(80).optional(),
});

/**
 * Step 2 of passkey registration. Verifies the attestation returned by
 * `navigator.credentials.create(...)` and persists the public key.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Invalid input" },
      { status: 400 },
    );
  }

  const expectedChallenge = consumeChallenge(`reg:${session.user.id}`);
  if (!expectedChallenge) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Registration challenge expired or missing. Try the Add passkey button again.",
      },
      { status: 400 },
    );
  }

  const { rpID, origin } = getRpConfig();

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response: parsed.data.response as RegistrationResponseJSON,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: false,
    });
  } catch (e) {
    return NextResponse.json(
      {
        success: false,
        error: (e as Error).message ?? "Verification failed",
      },
      { status: 400 },
    );
  }

  if (!verification.verified || !verification.registrationInfo) {
    return NextResponse.json(
      { success: false, error: "Registration not verified" },
      { status: 400 },
    );
  }

  const {
    credentialID,
    credentialPublicKey,
    counter: rawCounter,
    credentialDeviceType,
    credentialBackedUp,
  } = verification.registrationInfo;

  // SimpleWebAuthn v9: credentialID + credentialPublicKey are Uint8Array;
  // base64url-encode for stable text storage.
  const credentialId = Buffer.from(credentialID).toString("base64url");
  const publicKey = Buffer.from(credentialPublicKey).toString("base64url");
  const counter = BigInt(rawCounter ?? 0);
  // Transports come from the original response (not re-emitted in v9 verify).
  const transports = Array.isArray(
    (parsed.data.response as RegistrationResponseJSON)?.response?.transports,
  )
    ? (parsed.data.response as RegistrationResponseJSON).response
        .transports!.join(",")
    : null;

  // Reject if this credential id is already linked (could happen if the
  // user re-runs registration with the same authenticator).
  const dup = await prisma.passkey.findUnique({
    where: { credentialId },
    select: { id: true, userId: true },
  });
  if (dup) {
    return NextResponse.json(
      {
        success: false,
        error:
          dup.userId === session.user.id
            ? "This device is already registered."
            : "This device is registered to another account.",
      },
      { status: 409 },
    );
  }

  await prisma.passkey.create({
    data: {
      userId: session.user.id,
      credentialId,
      publicKey,
      counter,
      deviceType: credentialDeviceType,
      backedUp: credentialBackedUp,
      transports,
      deviceName: parsed.data.deviceName ?? null,
      lastUsedAt: new Date(),
    },
  });

  return NextResponse.json({ success: true });
}
