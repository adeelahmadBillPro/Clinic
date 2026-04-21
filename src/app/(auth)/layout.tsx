import { AuthBrandPanel } from "@/components/auth/AuthBrandPanel";
import { AuthSideExtras } from "@/components/auth/AuthSideExtras";
import { Logo } from "@/components/shared/Logo";
import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <AuthBrandPanel />
      <main className="relative flex min-h-dvh flex-col bg-background px-6 pt-8 pb-6 sm:px-10 lg:px-16 lg:pt-14">
        <div className="lg:hidden mb-6 flex items-center justify-between">
          <Link href="/" aria-label="Home">
            <Logo />
          </Link>
        </div>
        <div className="mx-auto w-full max-w-md">
          {children}
          <AuthSideExtras />
        </div>
        <footer className="mt-8 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} ClinicOS · All rights reserved.
        </footer>
      </main>
    </div>
  );
}
