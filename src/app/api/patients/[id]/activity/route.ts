import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/tenant-db";
import { prisma } from "@/lib/prisma";

type ActivityEntry = {
  time: string;
  action: string;
  by: string;
  summary: string;
  kind:
    | "registration"
    | "update"
    | "token"
    | "consultation"
    | "prescription"
    | "bill"
    | "appointment"
    | "pharmacy"
    | "lab"
    | "ipd"
    | "audit";
  reference?: string;
};

// Roles that see clinical detail. For reception / pharmacy / lab we redact
// consultations, prescriptions, vitals, labOrders so a receptionist
// pulling a patient's activity stream doesn't end up reading clinical PHI.
const CLINICAL_ROLES = new Set(["OWNER", "ADMIN", "DOCTOR", "NURSE"]);

export async function GET(
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

  // Cursor pagination: `before=<iso>` + `limit` (default 50, cap 200).
  // Without this the handler loaded every token / bill / consultation
  // ever written for the patient into memory, which OOMs on long-lived
  // patients and makes the UI unusable.
  const url = new URL(req.url);
  const limit = Math.min(
    200,
    Math.max(1, parseInt(url.searchParams.get("limit") ?? "50", 10) || 50),
  );
  const before = url.searchParams.get("before");
  const beforeDate =
    before && !isNaN(Date.parse(before)) ? new Date(before) : null;

  const canSeeClinical = CLINICAL_ROLES.has(session.user.role);

  const patient = await t.patient.findUnique({
    where: { id },
    select: { id: true, name: true, mrn: true, createdAt: true },
  });
  if (!patient) {
    return NextResponse.json(
      { success: false, error: "Patient not found" },
      { status: 404 },
    );
  }

  // Each source table slices to `limit` rows capped by `before`. Without
  // the bound we'd happily fetch years of tokens.
  const beforeFilter = beforeDate ? { lt: beforeDate } : undefined;
  const [
    tokens,
    consultations,
    prescriptions,
    bills,
    appointments,
    audits,
    pharmOrders,
    labOrders,
    admissions,
  ] = await Promise.all([
    t.token.findMany({
      where: { patientId: id, ...(beforeFilter ? { issuedAt: beforeFilter } : {}) },
      orderBy: { issuedAt: "desc" },
      take: limit,
    }),
    canSeeClinical
      ? t.consultation.findMany({
          where: { patientId: id, ...(beforeFilter ? { createdAt: beforeFilter } : {}) },
          orderBy: { createdAt: "desc" },
          take: limit,
        })
      : Promise.resolve([] as Awaited<ReturnType<typeof t.consultation.findMany>>),
    canSeeClinical
      ? t.prescription.findMany({
          where: { patientId: id, ...(beforeFilter ? { createdAt: beforeFilter } : {}) },
          orderBy: { createdAt: "desc" },
          take: limit,
        })
      : Promise.resolve([] as Awaited<ReturnType<typeof t.prescription.findMany>>),
    t.bill.findMany({
      where: { patientId: id, ...(beforeFilter ? { createdAt: beforeFilter } : {}) },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    t.appointment.findMany({
      where: { patientId: id, ...(beforeFilter ? { createdAt: beforeFilter } : {}) },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    t.auditLog.findMany({
      where: {
        entityType: "Patient",
        entityId: id,
        ...(beforeFilter ? { createdAt: beforeFilter } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    t.pharmacyOrder.findMany({
      where: { patientId: id, ...(beforeFilter ? { createdAt: beforeFilter } : {}) },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    canSeeClinical
      ? t.labOrder.findMany({
          where: { patientId: id, ...(beforeFilter ? { createdAt: beforeFilter } : {}) },
          orderBy: { createdAt: "desc" },
          take: limit,
        })
      : Promise.resolve([] as Awaited<ReturnType<typeof t.labOrder.findMany>>),
    t.ipdAdmission.findMany({
      where: { patientId: id, ...(beforeFilter ? { admissionDate: beforeFilter } : {}) },
      orderBy: { admissionDate: "desc" },
      take: limit,
    }),
  ]);

  // Pull user names for the ids we'll need
  const userIds = new Set<string>();
  tokens.forEach((tk) => userIds.add(tk.issuedBy));
  bills.forEach((b) => {
    if (b.collectedBy) userIds.add(b.collectedBy);
  });
  audits.forEach((a) => userIds.add(a.userId));

  const doctorIds = Array.from(
    new Set([
      ...consultations.map((c) => c.doctorId),
      ...prescriptions.map((r) => r.doctorId),
      ...tokens.map((t) => t.doctorId),
      ...appointments.map((a) => a.doctorId),
      ...admissions.map((a) => a.doctorId),
    ]),
  );
  const doctors = await t.doctor.findMany({
    where: { id: { in: doctorIds } },
  });
  doctors.forEach((d) => userIds.add(d.userId));
  const doctorUserMap = new Map(doctors.map((d) => [d.id, d.userId]));

  const users = await prisma.user.findMany({
    where: { id: { in: Array.from(userIds) } },
    select: { id: true, name: true },
  });
  const userName = (uid: string | null | undefined) =>
    (uid && users.find((u) => u.id === uid)?.name) || "System";

  const doctorName = (did: string) => {
    const uid = doctorUserMap.get(did);
    return uid ? `Dr. ${userName(uid)}` : "Doctor";
  };

  const entries: ActivityEntry[] = [];

  entries.push({
    time: patient.createdAt.toISOString(),
    action: "Patient registered",
    by: "System",
    summary: `${patient.name} added to the clinic with MRN ${patient.mrn}.`,
    kind: "registration",
  });

  for (const a of appointments) {
    entries.push({
      time: a.createdAt.toISOString(),
      action: "Appointment booked",
      by: a.bookedVia === "ONLINE" ? "Patient (online)" : "Reception",
      summary: `${doctorName(a.doctorId)} · ${new Date(a.appointmentDate).toLocaleDateString()} ${a.timeSlot}`,
      kind: "appointment",
      reference: a.id,
    });
  }

  for (const tk of tokens) {
    entries.push({
      time: tk.issuedAt.toISOString(),
      action: `Token ${tk.displayToken} issued`,
      by: userName(tk.issuedBy),
      summary: `${doctorName(tk.doctorId)} · status ${tk.status}`,
      kind: "token",
      reference: tk.id,
    });
  }

  for (const c of consultations) {
    entries.push({
      time: c.createdAt.toISOString(),
      action: "Consultation",
      by: doctorName(c.doctorId),
      summary:
        typeof c.assessment === "string" && c.assessment.trim().length > 0
          ? c.assessment.slice(0, 120)
          : "Consultation completed",
      kind: "consultation",
      reference: c.id,
    });
  }

  for (const r of prescriptions) {
    const meds = Array.isArray(r.medicines)
      ? (r.medicines as Array<{ name?: string }>)
      : [];
    entries.push({
      time: r.createdAt.toISOString(),
      action: "Prescription written",
      by: doctorName(r.doctorId),
      summary:
        meds
          .map((m) => m.name)
          .filter(Boolean)
          .slice(0, 3)
          .join(", ") ||
        "Prescription created",
      kind: "prescription",
      reference: r.id,
    });
  }

  for (const b of bills) {
    entries.push({
      time: b.createdAt.toISOString(),
      action: `Bill ${b.billNumber}`,
      by: userName(b.collectedBy),
      summary: `${b.billType} · ₨ ${Math.round(Number(b.totalAmount)).toLocaleString()} · ${b.status}`,
      kind: "bill",
      reference: b.id,
    });
  }

  for (const o of pharmOrders) {
    entries.push({
      time: o.createdAt.toISOString(),
      action: `Pharmacy order ${o.orderNumber}`,
      by: "Pharmacy",
      summary: `${o.status} · ${Array.isArray(o.items) ? (o.items as unknown[]).length : 0} items`,
      kind: "pharmacy",
      reference: o.id,
    });
  }

  for (const lo of labOrders) {
    entries.push({
      time: lo.createdAt.toISOString(),
      action: `Lab order ${lo.orderNumber}`,
      by: "Lab",
      summary: lo.status,
      kind: "lab",
      reference: lo.id,
    });
  }

  for (const adm of admissions) {
    entries.push({
      time: adm.admissionDate.toISOString(),
      action: `IPD admitted ${adm.admissionNumber}`,
      by: doctorName(adm.doctorId),
      summary: adm.status,
      kind: "ipd",
      reference: adm.id,
    });
  }

  for (const a of audits) {
    // Skip entries we've already represented from primary tables
    if (a.entityType === "Patient" && a.action === "PATIENT_REGISTERED") continue;
    entries.push({
      time: a.createdAt.toISOString(),
      // Title-case the audit action tag. Empty segments (e.g. actions with
      // leading / double underscores) used to crash here when `w[0]` was
      // undefined — guard with `?? ""`.
      action: a.action
        .toLowerCase()
        .split("_")
        .map((w) => (w[0]?.toUpperCase() ?? "") + w.slice(1))
        .join(" "),
      by: userName(a.userId),
      summary:
        a.details && typeof a.details === "object"
          ? JSON.stringify(a.details).slice(0, 120)
          : a.entityType,
      kind: "audit",
      reference: a.entityId ?? undefined,
    });
  }

  entries.sort((a, b) => (b.time > a.time ? 1 : -1));
  const paged = entries.slice(0, limit);
  const nextBefore =
    entries.length > limit ? paged[paged.length - 1]?.time : null;

  return NextResponse.json({
    success: true,
    data: {
      patient: { id: patient.id, name: patient.name, mrn: patient.mrn },
      entries: paged,
      phi: canSeeClinical,
      nextBefore,
    },
  });
}
