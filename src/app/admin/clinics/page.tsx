import { AdminClinicsClient } from "@/components/admin/AdminClinicsClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Clinics — Super Admin" };

export default function AdminClinicsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Clinics
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          All tenants on the platform. Suspend, activate, or extend trials.
        </p>
      </div>

      <AdminClinicsClient />
    </div>
  );
}
