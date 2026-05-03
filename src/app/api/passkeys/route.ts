import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * List the current user's registered passkeys (for /profile management UI).
 * Public key + credential id are intentionally NOT returned — they're
 * server-only secrets we don't expose.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 },
    );
  }

  const keys = await prisma.passkey.findMany({
    where: { userId: session.user.id },
    select: {
      id: true,
      deviceName: true,
      deviceType: true,
      backedUp: true,
      transports: true,
      lastUsedAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    success: true,
    data: keys.map((k) => ({
      id: k.id,
      deviceName: k.deviceName,
      deviceType: k.deviceType,
      backedUp: k.backedUp,
      transports: k.transports?.split(",") ?? [],
      lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
      createdAt: k.createdAt.toISOString(),
    })),
  });
}
