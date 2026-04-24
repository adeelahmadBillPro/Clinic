import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/api-guards";

// Per-doctor templates. Gated to DOCTOR / OWNER / ADMIN — receptionists
// and pharmacists have no reason to write prescriptions.
const createSchema = z.object({
  name: z.string().trim().min(1).max(80),
  items: z
    .array(
      z.object({
        medicineId: z.string().optional().nullable(),
        name: z.string().trim().min(1),
        genericName: z.string().optional(),
        dose: z.string().optional(),
        frequency: z.string().optional(),
        duration: z.string().optional(),
        route: z.string().optional(),
        instructions: z.string().optional(),
        qty: z.coerce.number().nonnegative().optional(),
      }),
    )
    .min(1),
});

export async function GET() {
  const gate = await requireApiRole(["DOCTOR", "OWNER", "ADMIN"]);
  if (gate instanceof NextResponse) return gate;
  const session = gate;
  if (!session?.user?.clinicId) {
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 },
    );
  }

  const templates = await prisma.prescriptionTemplate.findMany({
    where: {
      clinicId: session.user.clinicId,
      userId: session.user.id,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    success: true,
    data: templates.map((t) => ({
      id: t.id,
      name: t.name,
      items: t.items,
      createdAt: t.createdAt.toISOString(),
    })),
  });
}

export async function POST(req: Request) {
  const gate = await requireApiRole(["DOCTOR", "OWNER", "ADMIN"]);
  if (gate instanceof NextResponse) return gate;
  const session = gate;
  if (!session?.user?.clinicId) {
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  try {
    const tpl = await prisma.prescriptionTemplate.create({
      data: {
        clinicId: session.user.clinicId,
        userId: session.user.id,
        name: parsed.data.name,
        items: parsed.data.items,
      },
    });
    return NextResponse.json({
      success: true,
      data: { id: tpl.id, name: tpl.name, createdAt: tpl.createdAt.toISOString() },
    });
  } catch (err) {
    // Unique-constraint race: two saves with the same name from two tabs.
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "A template with this name already exists",
          field: "name",
        },
        { status: 409 },
      );
    }
    throw err;
  }
}
