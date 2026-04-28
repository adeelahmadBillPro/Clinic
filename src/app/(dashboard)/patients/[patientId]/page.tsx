import { notFound } from "next/navigation";
import Link from "next/link";
import { requireRole } from "@/lib/require-role";
import { db } from "@/lib/tenant-db";
import { prisma } from "@/lib/prisma";
import { AllergyBanner } from "@/components/shared/AllergyBanner";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowLeft, Printer, Pill } from "lucide-react";
import { DeletePatientButton } from "@/components/patients/DeletePatientButton";
import { EditPatientDialog } from "@/components/patients/EditPatientDialog";
import { PatientActivityTimeline } from "@/components/patients/PatientActivityTimeline";
import { PatientTokensList } from "@/components/patients/PatientTokensList";
import { isAdmin } from "@/lib/permissions";

export const dynamic = "force-dynamic";

function formatAge(dob: Date | null): string | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  if (diffMs < 0) return null;
  const years =
    now.getFullYear() -
    d.getFullYear() -
    (now <
    new Date(now.getFullYear(), d.getMonth(), d.getDate())
      ? 1
      : 0);
  if (years >= 2) return `${years} yrs`;
  const months = Math.floor(diffMs / (30.44 * 24 * 60 * 60 * 1000));
  if (months >= 1) return `${months} mo`;
  const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  if (days >= 1) return `${days} day${days > 1 ? "s" : ""}`;
  return "newborn";
}

export default async function PatientEmrPage({
  params,
}: {
  params: Promise<{ patientId: string }>;
}) {
  const { patientId } = await params;
  // P3-44: role gate
  const session = await requireRole(
    ["OWNER", "ADMIN", "DOCTOR", "RECEPTIONIST", "NURSE"],
    "/patients/[patientId]",
  );

  const t = db(session.user.clinicId);
  const [patient, clinic] = await Promise.all([
    t.patient.findUnique({ where: { id: patientId } }),
    prisma.clinic.findUnique({
      where: { id: session.user.clinicId },
      select: { name: true },
    }),
  ]);
  if (!patient) notFound();

  const [tokens, consultations, prescriptions, bills, vitals] = await Promise.all([
    t.token.findMany({
      where: { patientId: patient.id },
      orderBy: { issuedAt: "desc" },
      take: 10,
    }),
    t.consultation.findMany({
      where: { patientId: patient.id },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    t.prescription.findMany({
      where: { patientId: patient.id },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    t.bill.findMany({
      where: { patientId: patient.id },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    t.vitalSigns.findMany({
      where: { patientId: patient.id },
      orderBy: { recordedAt: "desc" },
      take: 5,
    }),
  ]);

  const doctorIds = Array.from(
    new Set(consultations.map((c) => c.doctorId).concat(tokens.map((x) => x.doctorId))),
  );
  const doctorProfiles = await t.doctor.findMany({
    where: { id: { in: doctorIds } },
  });
  const userIds = doctorProfiles.map((d) => d.userId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true },
  });
  const doctorNameById = new Map(
    doctorProfiles.map((d) => [
      d.id,
      users.find((u) => u.id === d.userId)?.name ?? "Doctor",
    ]),
  );

  const ageLabel = formatAge(patient.dob);

  // Outstanding consultation balance (PENDING / PARTIAL OPD bills)
  const opdUnpaid = bills.filter(
    (b) => b.billType === "OPD" && (b.status === "PENDING" || b.status === "PARTIAL"),
  );
  const outstanding = opdUnpaid.reduce(
    (sum, b) => sum + Number(b.balance),
    0,
  );

  return (
    <div className="space-y-6">
      <Link
        href="/patients"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to patients
      </Link>

      <AllergyBanner allergies={patient.allergies} />

      <div className="rounded-xl border bg-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {patient.name}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <span className="font-mono">{patient.mrn}</span>
              <span>·</span>
              <span>{patient.phone}</span>
              {patient.bloodGroup && (
                <>
                  <span>·</span>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                    {patient.bloodGroup}
                  </span>
                </>
              )}
              {ageLabel && (
                <>
                  <span>·</span>
                  <span>{ageLabel}</span>
                </>
              )}
              <span>·</span>
              <span>
                {patient.gender === "M"
                  ? "Male"
                  : patient.gender === "F"
                    ? "Female"
                    : "Other"}
              </span>
            </div>
            {patient.chronicConditions.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {patient.chronicConditions.map((c) => (
                  <Badge key={c} variant="secondary">
                    {c}
                  </Badge>
                ))}
              </div>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {outstanding > 0 ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-destructive/30 bg-destructive/10 px-2.5 py-1 text-xs font-semibold text-destructive">
                  <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
                  Fee unpaid · ₨ {Math.round(outstanding).toLocaleString()} owed
                </span>
              ) : bills.some((b) => b.billType === "OPD") ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Consultation fee paid
                </span>
              ) : null}
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/reception?patient=${patient.id}`}
              className={cn(buttonVariants({ size: "sm" }))}
            >
              Issue token
            </Link>
            <EditPatientDialog
              patient={{
                id: patient.id,
                name: patient.name,
                phone: patient.phone,
                gender: patient.gender,
                dob: patient.dob ? patient.dob.toISOString() : null,
                address: patient.address,
                bloodGroup: patient.bloodGroup,
                emergencyContact: patient.emergencyContact,
                emergencyPhone: patient.emergencyPhone,
              }}
            />
            {isAdmin(session.user.role) && (
              <DeletePatientButton
                patientId={patient.id}
                patientName={patient.name}
              />
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Latest vitals</CardTitle>
          </CardHeader>
          <CardContent>
            {vitals.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No vitals recorded yet.
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {vitals.map((v) => (
                  <li
                    key={v.id}
                    className="flex items-center justify-between gap-3 border-b pb-2 last:border-0"
                  >
                    <div className="text-xs text-muted-foreground">
                      {new Date(v.recordedAt).toLocaleString()}
                    </div>
                    <div className="text-xs">
                      {v.bp && <>BP {v.bp} · </>}
                      {v.pulse && <>Pulse {v.pulse} · </>}
                      {v.temperature && <>Temp {String(v.temperature)}°C · </>}
                      {v.weight && <>Wt {String(v.weight)}kg</>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Recent tokens</CardTitle>
          </CardHeader>
          <CardContent>
            <PatientTokensList
              tokens={tokens.map((tk) => ({
                id: tk.id,
                displayToken: tk.displayToken,
                status: tk.status,
                issuedAt: tk.issuedAt.toISOString(),
                expiresAt: tk.expiresAt.toISOString(),
                doctorName: doctorNameById.get(tk.doctorId) ?? "Doctor",
              }))}
              patientName={patient.name}
              patientPhone={patient.phone}
              clinicName={clinic?.name ?? "ClinicOS"}
            />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm">Consultations</CardTitle>
          </CardHeader>
          <CardContent>
            {consultations.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No consultations yet.
              </p>
            ) : (
              <ul className="space-y-3">
                {consultations.map((c) => (
                  <li
                    key={c.id}
                    className="rounded-lg border p-3.5 text-sm"
                  >
                    <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span>
                        {doctorNameById.get(c.doctorId) ?? "Doctor"} ·{" "}
                        {new Date(c.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="mt-1 font-medium">{c.chiefComplaint}</div>
                    {c.assessment && (
                      <div className="mt-1 text-muted-foreground">
                        <span className="font-medium">Assessment:</span>{" "}
                        {c.assessment}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5 text-sm">
              <Pill className="h-3.5 w-3.5 text-muted-foreground" />
              Recent prescriptions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {prescriptions.length === 0 ? (
              <p className="text-sm text-muted-foreground">None yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {prescriptions.map((r) => {
                  const meds = Array.isArray(r.medicines)
                    ? (r.medicines as Array<{ name?: string }>)
                    : [];
                  return (
                    <li
                      key={r.id}
                      className="flex items-start justify-between gap-2 border-b pb-2 last:border-0"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-xs text-muted-foreground">
                          {new Date(r.createdAt).toLocaleDateString()} ·{" "}
                          {r.status}
                        </div>
                        <div className="truncate text-xs">
                          {meds
                            .map((m) => m?.name)
                            .filter(Boolean)
                            .join(", ") || "—"}
                        </div>
                      </div>
                      <Link
                        href={`/prescriptions/${r.id}`}
                        target="_blank"
                        className="inline-flex shrink-0 items-center gap-1 rounded-md border bg-background px-2 py-1 text-[11px] font-medium text-muted-foreground transition hover:border-primary/40 hover:text-primary"
                        title="Reprint prescription (slip gum ho gayi to dobara print karein)"
                      >
                        <Printer className="h-3 w-3" />
                        Print
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Recent bills</CardTitle>
          </CardHeader>
          <CardContent>
            {bills.length === 0 ? (
              <p className="text-sm text-muted-foreground">None yet.</p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {bills.map((b) => (
                  <li
                    key={b.id}
                    className="flex items-center justify-between gap-2"
                  >
                    <span className="font-mono text-xs">{b.billNumber}</span>
                    <span className="text-xs text-muted-foreground">
                      {b.billType}
                    </span>
                    <span className="text-xs">
                      ₨ {Number(b.totalAmount).toLocaleString()}
                    </span>
                    <Badge variant="secondary" className="text-[10px]">
                      {b.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <PatientActivityTimeline patientId={patient.id} />
    </div>
  );
}
