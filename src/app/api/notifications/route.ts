import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/tenant-db";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 },
    );
  }
  // Super admins (and any future unbound user) have no clinicId — no
  // clinic-scoped notifications exist for them. Return empty data with
  // 200 so the NotificationBell quietly shows zero instead of throwing
  // a 401 in the browser console.
  if (!session.user.clinicId) {
    return NextResponse.json({
      success: true,
      data: { unread: 0, notifications: [] },
    });
  }
  const t = db(session.user.clinicId);
  const notifications = await t.notification.findMany({
    where: {
      userId: session.user.id,
      channel: "IN_APP",
    },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  const unread = notifications.filter((n) => n.status !== "READ").length;
  return NextResponse.json({
    success: true,
    data: {
      unread,
      notifications: notifications.map((n) => ({
        id: n.id,
        type: n.type,
        message: n.message,
        status: n.status,
        patientId: n.patientId,
        createdAt: n.createdAt.toISOString(),
      })),
    },
  });
}

export async function PATCH(req: Request) {
  // Mark all as read (or specific ids via body.ids)
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 },
    );
  }
  // No clinicId → nothing to mark, succeed silently.
  if (!session.user.clinicId) {
    return NextResponse.json({ success: true });
  }
  const body = await req.json().catch(() => ({}));
  const ids: string[] | undefined = Array.isArray(body?.ids) ? body.ids : undefined;

  const t = db(session.user.clinicId);
  await t.notification.updateMany({
    where: {
      userId: session.user.id,
      ...(ids && ids.length > 0 ? { id: { in: ids } } : {}),
    },
    data: { status: "READ" },
  });
  return NextResponse.json({ success: true });
}
