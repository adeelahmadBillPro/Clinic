import Link from "next/link";
import { Logo } from "@/components/shared/Logo";

export const metadata = { title: "Terms of Service — ClinicOS" };

export default function TermsPage() {
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
        <h1>Terms of Service</h1>
        <p className="text-muted-foreground">
          Last updated: {new Date().toLocaleDateString()}
        </p>
        <p>
          These are placeholder Terms while ClinicOS is in early access. The
          final terms will be drafted by legal counsel before general
          availability. By signing up you agree that you are authorised to
          register a clinic account, that you&rsquo;ll keep your login
          credentials private, and that ClinicOS may update these terms with
          reasonable notice.
        </p>
        <h2>Use of the service</h2>
        <p>
          Don&rsquo;t use ClinicOS to store data you don&rsquo;t have the
          right to hold, don&rsquo;t attempt to interfere with other tenants,
          and don&rsquo;t use the API to probe other clinics&rsquo; data.
        </p>
        <h2>Subscriptions</h2>
        <p>
          Paid plans renew on the cadence you selected (monthly or yearly).
          Cancel from the Subscription page; access continues until the end
          of the current period.
        </p>
        <h2>Contact</h2>
        <p>
          Questions: <a href="mailto:hello@clinicos.app">hello@clinicos.app</a>.
        </p>
      </main>
    </div>
  );
}
