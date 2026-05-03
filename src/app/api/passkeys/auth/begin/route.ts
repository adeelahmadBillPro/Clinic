import { NextResponse } from "next/server";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { getRpConfig, saveChallenge } from "@/lib/webauthn";
import { randomBytes } from "crypto";

/**
 * Step 1 of passkey login. Generates a challenge for the browser to
 * sign with the user's authenticator.
 *
 * No email required — discoverable credential flow lets the browser
 * show the user a list of usable passkeys for this site. The user
 * picks one, the device signs, and we resolve the user from the
 * credential id on the verify step.
 */
export async function POST() {
  const { rpID } = getRpConfig();

  const options = await generateAuthenticationOptions({
    rpID,
    // No allowCredentials → discoverable / passkey-style auth. The
    // browser shows all passkeys for this rpID it knows about.
    allowCredentials: [],
    userVerification: "preferred",
  });

  // Anonymous session token so we can re-correlate this challenge on
  // the verify step (no logged-in user yet, so we can't key by userId).
  const sessionToken = randomBytes(24).toString("hex");
  saveChallenge(`auth:${sessionToken}`, options.challenge);

  return NextResponse.json({
    success: true,
    data: { sessionToken, options },
  });
}
