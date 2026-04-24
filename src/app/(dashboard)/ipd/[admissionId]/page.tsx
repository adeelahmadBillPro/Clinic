import { notFound } from "next/navigation";
import Link from "next/link";
import { requireRole } from "@/lib/require-role";
import { db } from "@/lib/tenant-db";
import { prisma } from "@/lib/prisma";
import { ArrowLeft, BedDouble, Calendar, Stethoscope } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AdmissionChart } from "@/components/ipd/AdmissionChart";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admission chart — ClinicOS" };

export default async function AdmissionDetailPage({
  params,
}: {
  params: Promise<{ admissionId: string }>;
}) {
  const { admissionId } = await params;
  // P3-44: role gate
  const session = await requireRole(
    ["OWNER", "ADMIN", "NURSE", "DOCTOR"],
    "/ipd/[admissionId]",
  );
  void session;

  const t = db(session.user.clinicId);
  const adm = await t.ipdAdmission.findUnique({ where: { id: admissionId } });
  if (!adm) notFound();

  const [patient, bed, doctor] = await Promise.all([
    t.patient.findUnique({ where: { id: adm.patientId } }),
    t.bed.findUnique({ where: { id: adm.bedId } }),
    t.doctor.findUnique({ where: { id: adm.doctorId } }),
  ]);

  const doctorUser = doctor
    ? await prisma.user.findUnique({
        where: { id: doctor.userId },
        select: { name: true },
      })
    : null;

  const days = Math.max(
    1,
    Math.ceil(
      ((adm.dischargeDate ?? new Date()).getTime() -
        adm.admissionDate.getTime()) /
        (24 * 60 * 60 * 1000),
    ),
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link
        href="/ipd"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to IPD
      </Link>

      {/* Header */}
      <div className="card-surface p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">
                {patient?.name ?? "Unknown"}
              </h1>
              <Badge
                variant={adm.status === "ADMITTED" ? "default" : "secondary"}
              >
                {adm.status}
              </Badge>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <span className="font-mono">{adm.admissionNumber}</span>
              {patient && (
                <>
                  <span>·</span>
                  <span>
                    {patient.mrn} · {patient.phone}
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Stay
            </div>
            <div className="text-lg font-bold">
              {days} day{days === 1 ? "" : "s"}
            </div>
            {bed && (
              <div className="text-xs text-muted-foreground">
                ₨ {Math.round(Number(bed.dailyRate) * days).toLocaleString()}{" "}
                bed charges
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 grid gap-3 rounded-lg bg-muted/40 p-3 text-xs sm:grid-cols-3">
          {bed && (
            <div>
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Bed
              </div>
              <div className="mt-0.5 inline-flex items-center gap-1 font-medium">
                <BedDouble className="h-3.5 w-3.5" />
                {bed.bedNumber} · {bed.wardName}
              </div>
              <div className="text-muted-foreground">
                {bed.bedType.replace("_", " ")} · ₨{" "}
                {Math.round(Number(bed.dailyRate)).toLocaleString()}/day
              </div>
            </div>
          )}
          {doctorUser && doctor && (
            <div>
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Attending
              </div>
              <div className="mt-0.5 inline-flex items-center gap-1 font-medium">
                <Stethoscope className="h-3.5 w-3.5" />
                Dr. {doctorUser.name}
              </div>
              <div className="text-muted-foreground">
                {doctor.specialization}
              </div>
            </div>
          )}
          <div>
            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Admitted
            </div>
            <div className="mt-0.5 inline-flex items-center gap-1 font-medium">
              <Calendar className="h-3.5 w-3.5" />
              {adm.admissionDate.toLocaleDateString(undefined, {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </div>
            {adm.dischargeDate && (
              <div className="text-muted-foreground">
                Discharged{" "}
                {adm.dischargeDate.toLocaleDateString(undefined, {
                  day: "numeric",
                  month: "short",
                })}
              </div>
            )}
          </div>
        </div>

        {adm.admissionDiagnosis && (
          <div className="mt-4 rounded-lg border-l-4 border-primary/30 bg-muted/30 p-3 text-sm">
            <div className="mb-0.5 text-xs font-semibold text-muted-foreground">
              Admission diagnosis
            </div>
            <div>{adm.admissionDiagnosis}</div>
          </div>
        )}
        {adm.dischargeDiagnosis && (
          <div className="mt-2 rounded-lg border-l-4 border-emerald-500/40 bg-emerald-500/5 p-3 text-sm">
            <div className="mb-0.5 text-xs font-semibold text-muted-foreground">
              Discharge diagnosis
            </div>
            <div>{adm.dischargeDiagnosis}</div>
          </div>
        )}
      </div>

      {/* Nursing notes timeline + entry form */}
      <AdmissionChart
        admissionId={adm.id}
        canEdit={adm.status === "ADMITTED"}
      />
    </div>
  );
}
