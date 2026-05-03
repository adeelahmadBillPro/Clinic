import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { db } from "@/lib/tenant-db";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { ScheduleEditor, type WeeklySchedule } from "@/components/profile/ScheduleEditor";
import { PasskeyManager } from "@/components/profile/PasskeyManager";

export const dynamic = "force-dynamic";
export const metadata = { title: "My profile — ClinicOS" };

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.clinicId) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      photoUrl: true,
      createdAt: true,
      lastLoginAt: true,
    },
  });
  if (!user) redirect("/login");

  // Doctor profile also applies to OWNER/ADMIN who practice
  let doctor = null;
  let schedule: WeeklySchedule | null = null;
  if (["DOCTOR", "OWNER", "ADMIN"].includes(user.role)) {
    const d = await db(session.user.clinicId).doctor.findFirst({
      where: { userId: user.id },
    });
    if (d) {
      doctor = {
        id: d.id,
        specialization: d.specialization,
        qualification: d.qualification,
        roomNumber: d.roomNumber,
        consultationFee: Number(d.consultationFee),
        experienceYears: d.experienceYears,
        about: d.about,
        languages: d.languages,
        gender: d.gender,
        whatsappNumber: d.whatsappNumber,
        photoUrl: d.photoUrl,
      };
      const raw = (d.schedule ?? {}) as Record<
        string,
        { start: string; end: string } | null | number
      >;
      const read = (k: string) => {
        const v = raw[k];
        return v && typeof v === "object" && "start" in v
          ? { start: v.start, end: v.end }
          : null;
      };
      schedule = {
        mon: read("mon"),
        tue: read("tue"),
        wed: read("wed"),
        thu: read("thu"),
        fri: read("fri"),
        sat: read("sat"),
        sun: read("sun"),
      };
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          My profile
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Update your personal details, profile photo{user.role === "DOCTOR" ? ", clinical profile" : ""} and password.
        </p>
      </div>

      <ProfileForm
        user={{
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          photoUrl: user.photoUrl,
          memberSince: user.createdAt.toISOString(),
          lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
        }}
        doctor={doctor}
      />

      {doctor && schedule && <ScheduleEditor initial={schedule} />}

      <PasskeyManager />
    </div>
  );
}
