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
  const allDoctors = await t.doctor.findMany({ where: { isAvailable: true } });
  // Only doctors with a real weekly schedule can accept online bookings.
  const doctors = allDoctors.filter((d) => {
    const s = (d.schedule ?? {}) as Record<string, unknown>;
    return ["mon", "tue", "wed", "thu", "fri", "sat", "sun"].some((k) => {
      const v = s[k];
      return v && typeof v === "object" && v !== null && "start" in v;
    });
  });
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

        {doctorList.length === 0 ? (
          <div className="card-surface mx-auto max-w-lg p-10 text-center">
            <div className="text-lg font-semibold">
              Online booking not available yet
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {allDoctors.length === 0
                ? "This clinic hasn't set up doctors yet."
                : "Doctors haven't published their schedules yet. Please call the clinic to book."}
            </p>
            {clinic.phone && (
              <a
                href={`tel:${clinic.phone.replace(/[^\d+]/g, "")}`}
                className="mt-4 inline-flex h-10 items-center gap-1.5 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground hover:shadow-sm"
              >
                Call {clinic.phone}
              </a>
            )}
          </div>
        ) : (
          <>
            <PublicBookingForm
              slug={slug}
              doctors={doctorList}
              clinic={{
                name: clinic.name,
                phone: clinic.phone,
                address: clinic.address,
              }}
            />
            <p className="mt-8 text-center text-xs text-muted-foreground">
              By booking you agree to be contacted at the phone number
              provided.
            </p>
          </>
        )}
      </main>
    </div>
  );
}
