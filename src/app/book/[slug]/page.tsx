import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { db } from "@/lib/tenant-db";
import { getDoctorRatings } from "@/lib/reviews";
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
  const [users, ratingMap] = await Promise.all([
    prisma.user.findMany({
      where: {
        id: { in: doctors.map((d) => d.userId) },
        isActive: true,
      },
      select: { id: true, name: true, photoUrl: true },
    }),
    getDoctorRatings(
      clinic.id,
      doctors.map((d) => d.id),
    ),
  ]);
  const doctorList = doctors
    .map((d) => {
      const u = users.find((x) => x.id === d.userId);
      const r = ratingMap.get(d.id);
      return u
        ? {
            id: d.id,
            name: u.name,
            specialization: d.specialization,
            qualification: d.qualification,
            consultationFee: Number(d.consultationFee),
            photoUrl: d.photoUrl ?? u.photoUrl ?? null,
            experienceYears: d.experienceYears,
            about: d.about,
            languages: d.languages,
            isAvailable: d.isAvailable,
            rating: r ? Number(r.avg.toFixed(1)) : null,
            reviewCount: r?.count ?? 0,
          }
        : null;
    })
    .filter(Boolean) as Array<{
    id: string;
    name: string;
    specialization: string;
    qualification: string;
    consultationFee: number;
    photoUrl: string | null;
    experienceYears: number;
    about: string | null;
    languages: string[];
    isAvailable: boolean;
    rating: number | null;
    reviewCount: number;
  }>;

  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Logo />
          <div className="text-xs text-muted-foreground">
            Secure online booking
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Book at {clinic.name}
          </h1>
          {clinic.address && (
            <p className="mt-1 text-sm text-muted-foreground">
              {clinic.address}
            </p>
          )}
        </div>

        <PublicBookingForm slug={slug} doctors={doctorList} />

        <p className="mt-8 text-center text-xs text-muted-foreground">
          By booking you agree to be contacted at the phone number provided.
        </p>
      </main>
    </div>
  );
}
