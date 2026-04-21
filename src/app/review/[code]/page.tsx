import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Logo } from "@/components/shared/Logo";
import { ReviewForm } from "@/components/reviews/ReviewForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Leave a review — ClinicOS" };

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  if (!/^APT-[A-Z0-9]{6}$/i.test(code)) notFound();

  const tail = code.replace(/^APT-/i, "").toLowerCase();
  const appt = await prisma.appointment.findFirst({
    where: { id: { endsWith: tail } },
    select: {
      id: true,
      clinicId: true,
      doctorId: true,
      patientName: true,
      patientPhone: true,
      appointmentDate: true,
    },
  });
  if (!appt) notFound();

  const [clinic, doctor, existing] = await Promise.all([
    prisma.clinic.findUnique({
      where: { id: appt.clinicId },
      select: { name: true, slug: true },
    }),
    prisma.doctor.findUnique({
      where: { id: appt.doctorId },
      select: { id: true, specialization: true, userId: true },
    }),
    prisma.review.findFirst({
      where: { appointmentId: appt.id },
      select: { id: true, rating: true, comment: true },
    }),
  ]);

  const doctorUser = doctor
    ? await prisma.user.findUnique({
        where: { id: doctor.userId },
        select: { name: true },
      })
    : null;

  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
          <Logo />
          <div className="text-xs text-muted-foreground">
            Share your experience
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-4 py-8 sm:px-6 sm:py-12">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          How was your visit?
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {clinic?.name}
          {doctorUser ? ` · Dr. ${doctorUser.name}` : ""}
          {doctor ? ` · ${doctor.specialization}` : ""}
        </p>

        <div className="mt-6">
          <ReviewForm
            confirmation={code.toUpperCase()}
            appointmentDate={appt.appointmentDate.toISOString()}
            defaultName={appt.patientName}
            defaultPhone={appt.patientPhone}
            existing={existing}
          />
        </div>
      </main>
    </div>
  );
}
