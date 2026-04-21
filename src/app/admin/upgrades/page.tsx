import { AdminUpgradesClient } from "@/components/admin/AdminUpgradesClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Upgrade requests — Super Admin" };

export default function AdminUpgradesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Upgrade requests
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Verify the manual payment and approve — the subscription activates
          instantly and the owner gets notified.
        </p>
      </div>

      <AdminUpgradesClient />
    </div>
  );
}
