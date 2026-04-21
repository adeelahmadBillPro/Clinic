import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/tenant-db";
import { isAdmin } from "@/lib/permissions";
import { DoctorDesk } from "@/components/doctor/DoctorDesk";

export const dynamic = "force-dynamic";
export const metadata = { title: "My queue — ClinicOS" };

export default async function DoctorPage() {
  const session = await auth();
  if (!session?.user?.clinicId) redirect("/login");

  if (session.user.role !== "DOCTOR" && !isAdmin(session.user.role)) {
    redirect("/dashboard");
  }

  const t = db(session.user.clinicId);

  // If the logged-in user is a doctor, we auto-select their profile.
  // If admin, they can pick.
  const doctors = await t.doctor.findMany();
  let myDoctorId: string | null = null;
  if (session.user.role === "DOCTOR") {
    const mine = doctors.find((d) => d.userId === session.user.id);
    myDoctorId = mine?.id ?? null;
  }

  return (
    <DoctorDesk
      isAdmin={isAdmin(session.user.role)}
      currentDoctorId={myDoctorId}
      userId={session.user.id}
    />
  );
}
