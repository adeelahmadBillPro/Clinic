import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/tenant-db";

const bodySchema = z.object({
  shift: z.enum(["MORNING", "EVENING", "NIGHT"]).default("MORNING"),
  vitals: z
    .object({
      bp: z.string().optional(),
      pulse: z.string().optional(),
      temperature: z.string().optional(),
      spO2: z.string().optional(),
      respiratoryRate: z.string().optional(),
      bloodSugar: z.string().optional(),
    })
    .optional(),
  medications: z
    .array(
      z.object({
        name: z.string().min(1),
        dose: z.string().optional(),
        time: z.string().optional(),
      }),
    )
    .optional(),
  observations: z.string().max(1000).optional(),
});

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.clinicId) {
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 },
    );
  }
  const { id } = await ctx.params;
  const t = db(session.user.clinicId);
  const notes = await t.nursingNote.findMany({
    where: { admissionId: id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ success: true, data: notes });
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.clinicId) {
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 },
    );
  }
  const { id } = await ctx.params;
  const t = db(session.user.clinicId);
  const admission = await t.ipdAdmission.findUnique({ where: { id } });
  if (!admission) {
    return NextResponse.json(
      { success: false, error: "Admission not found" },
      { status: 404 },
    );
  }
  if (admission.status !== "ADMITTED") {
    return NextResponse.json(
      { success: false, error: "Admission is not active" },
      { status: 400 },
    );
  }

  const json = await req.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Invalid input",
      },
      { status: 400 },
    );
  }

  const note = await t.nursingNote.create({
    data: {
      clinicId: session.user.clinicId,
      admissionId: id,
      patientId: admission.patientId,
      nurseId: session.user.id,
      shift: parsed.data.shift,
      vitals: parsed.data.vitals ?? {},
      medications: parsed.data.medications ?? [],
      observations: parsed.data.observations ?? null,
    },
  });

  return NextResponse.json({ success: true, data: { id: note.id } });
}
