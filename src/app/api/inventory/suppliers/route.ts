import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/tenant-db";
import { z } from "zod";

const schema = z.object({
  name: z.string().trim().min(1).max(200),
  contact: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.clinicId) {
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 },
    );
  }
  const t = db(session.user.clinicId);
  const suppliers = await t.supplier.findMany({
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ success: true, data: suppliers });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.clinicId) {
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 },
    );
  }
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message },
      { status: 400 },
    );
  }
  const t = db(session.user.clinicId);
  const supplier = await t.supplier.create({
    data: {
      clinicId: session.user.clinicId,
      name: parsed.data.name,
      contact: parsed.data.contact || null,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
      address: parsed.data.address || null,
    },
  });
  return NextResponse.json({ success: true, data: supplier });
}
