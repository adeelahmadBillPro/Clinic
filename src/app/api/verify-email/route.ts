import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function GET(req: Request) {
  // Email verification lands on the page via the link in the signup email.
  // The page component calls this route; we respond with JSON so the
  // client can show a friendly confirmation UI.
  const url = new URL(req.url);
  const token = (url.searchParams.get("token") ?? "").trim();
  if (!token) {
    return NextResponse.json(
      { success: false, error: "Missing token" },
      { status: 400 },
    );
  }

  const hash = hashToken(token);

  // Atomic flip — only the first valid request activates the user. Lookup
  // uses the hash (never the raw token) so DB compromise doesn't hand the
  // attacker a working link.
  const flip = await prisma.user.updateMany({
    where: { emailVerifyTokenHash: hash, emailVerifiedAt: null },
    data: {
      emailVerifiedAt: new Date(),
      isActive: true,
      emailVerifyTokenHash: null,
    },
  });
  if (flip.count === 0) {
    return NextResponse.json(
      {
        success: false,
        error: "This link is invalid or has already been used.",
      },
      { status: 400 },
    );
  }

  return NextResponse.json({ success: true });
}
