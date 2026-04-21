import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LabQueue } from "@/components/lab/LabQueue";

export const dynamic = "force-dynamic";
export const metadata = { title: "Lab — ClinicOS" };

export default async function LabPage() {
  const session = await auth();
  if (!session?.user?.clinicId) redirect("/login");
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Lab</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Order tests, collect samples, enter results, and share abnormal-flagged
          reports.
        </p>
      </div>
      <LabQueue />
    </div>
  );
}
