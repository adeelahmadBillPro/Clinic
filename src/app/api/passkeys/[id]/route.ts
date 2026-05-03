import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * Remove a passkey (e.g. lost device, no longer trusted). Only the
 * passkey's owner can delete it — even admins can't delete another
 * user's passkey from this endpoint (no surface for that yet, intended).
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 },
    );
  }
  const { id } = await params;

  // updateMany / deleteMany with both id + userId in the WHERE means a
  // cross-user delete attempt returns count=0 instead of touching another
  // user's row.
  const result = await prisma.passkey.deleteMany({
    where: { id, userId: session.user.id },
  });

  if (result.count === 0) {
    return NextResponse.json(
      { success: false, error: "Passkey not found" },
      { status: 404 },
    );
  }

  return NextResponse.json({ success: true });
}
