import Link from "next/link";
import { Logo } from "@/components/shared/Logo";

export const metadata = { title: "Privacy Policy — ClinicOS" };

export default function PrivacyPage() {
  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Logo />
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Home
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-10 prose prose-sm dark:prose-invert">
        <h1>Privacy Policy</h1>
        <p className="text-muted-foreground">
          Last updated: {new Date().toLocaleDateString()}
        </p>
        <p>
          ClinicOS stores clinical data on behalf of clinics
          (&ldquo;tenants&rdquo;). Each tenant&rsquo;s data is isolated at the
          row level; no staff from other tenants can read it, and ClinicOS
          staff only access it with your written permission or where required
          by law.
        </p>
        <h2>What we collect</h2>
        <ul>
          <li>Account details (name, email, phone, role)</li>
          <li>Clinical records you enter (patients, consultations, bills, etc.)</li>
          <li>Operational logs (audit trail, login times, IP address for
              security investigations)</li>
        </ul>
        <h2>What we don&rsquo;t do</h2>
        <ul>
          <li>We don&rsquo;t sell data to third parties.</li>
          <li>We don&rsquo;t train models on your patients&rsquo; records.</li>
          <li>We don&rsquo;t expose PHI in URLs or analytics events.</li>
        </ul>
        <h2>Data requests</h2>
        <p>
          Email <a href="mailto:privacy@clinicos.app">privacy@clinicos.app</a>{" "}
          to request an export or deletion. Export is returned within 30 days;
          deletion is subject to any legal retention requirements in your
          jurisdiction.
        </p>
      </main>
    </div>
  );
}
