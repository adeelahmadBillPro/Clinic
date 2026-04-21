import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { db } from "@/lib/tenant-db";
import { PublicBookingForm } from "@/components/appointments/PublicBookingForm";
import { Logo } from "@/components/shared/Logo";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const clinic = await prisma.clinic.findUnique({
    where: { slug },
    select: { name: true },
  });
  return { title: clinic ? `Book at ${clinic.name}` : "Book appointment" };
}

export default async function PublicBookingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const clinic = await prisma.clinic.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      phone: true,
      address: true,
      isActive: true,
    },
  });
  if (!clinic || !clinic.isActive) notFound();

  const t = db(clinic.id);
  const doctors = await t.doctor.findMany({ where: { isAvailable: true } });
  const users = await prisma.user.findMany({
    where: {
      id: { in: doctors.map((d) => d.userId) },
      isActive: true,
    },
    select: { id: true, name: true },
  });
  const doctorList = doctors
    .map((d) => {
      const u = users.find((x) => x.id === d.userId);
      return u
        ? {
            id: d.id,
            name: u.name,
            specialization: d.specialization,
            qualification: d.qualification,
            consultationFee: Number(d.consultationFee),
          }
        : null;
    })
    .filter(Boolean) as Array<{
    id: string;
    name: string;
    specialization: string;
    qualification: string;
    consultationFee: number;
  }>;

  return (
    <div className="min-h-dvh bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
          <Logo />
          <div className="text-xs text-muted-foreground">
            Secure online booking
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-10">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-semibold tracking-tight">
            Book at {clinic.name}
          </h1>
          {clinic.address && (
            <p className="mt-1 text-sm text-muted-foreground">
              {clinic.address}
            </p>
          )}
        </div>

        <PublicBookingForm slug={slug} doctors={doctorList} />

        <p className="mt-6 text-center text-xs text-muted-foreground">
          By booking you agree to be contacted at the phone number provided.
        </p>
      </main>
    </div>
  );
}
