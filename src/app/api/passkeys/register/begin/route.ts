import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { getRpConfig, saveChallenge } from "@/lib/webauthn";

/**
 * Step 1 of passkey registration. User must be logged in (with password
 * or another passkey) to register a new passkey for their account.
 *
 * Returns the registration options the browser passes to
 * `navigator.credentials.create(...)`.
 */
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, name: true },
  });
  if (!user) {
    return NextResponse.json(
      { success: false, error: "User not found" },
      { status: 404 },
    );
  }

  // Existing passkeys are excluded so the browser doesn't re-register a
  // passkey the user already has on this device.
  const existing = await prisma.passkey.findMany({
    where: { userId: user.id },
    select: { credentialId: true, transports: true },
  });

  const { rpID, rpName } = getRpConfig();

  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    // v9 API: userID is a string (the lib base64url-encodes internally).
    userID: user.id,
    userName: user.email,
    userDisplayName: user.name,
    attestationType: "none",
    // v9 expects credential ids as Uint8Array (BufferSource). We store
    // them base64url-encoded, so decode back here.
    excludeCredentials: existing.map((c) => ({
      id: new Uint8Array(Buffer.from(c.credentialId, "base64url")),
      type: "public-key",
      transports: c.transports
        ? (c.transports.split(",") as AuthenticatorTransportFuture[])
        : undefined,
    })),
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
    },
  });

  // Store the challenge keyed on userId — we'll re-read it on /finish.
  saveChallenge(`reg:${user.id}`, options.challenge);

  return NextResponse.json({ success: true, data: options });
}

// Imported separately to avoid pulling the whole types package into the
// runtime bundle when unused.
type AuthenticatorTransportFuture =
  | "ble"
  | "cable"
  | "hybrid"
  | "internal"
  | "nfc"
  | "smart-card"
  | "usb";
