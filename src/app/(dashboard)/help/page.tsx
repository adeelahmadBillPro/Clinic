import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { HelpGuide } from "@/components/help/HelpGuide";

export const dynamic = "force-dynamic";
export const metadata = { title: "Getting started — ClinicOS" };

export default async function HelpPage() {
  const session = await auth();
  if (!session?.user?.clinicId) redirect("/login");

  return <HelpGuide role={session.user.role} name={session.user.name ?? ""} />;
}
