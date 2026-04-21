import Link from "next/link";
import { Logo } from "@/components/shared/Logo";

export function LandingFooter() {
  return (
    <footer className="border-t bg-muted/30 py-10">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <Logo />
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground">
              Features
            </a>
            <a href="#pricing" className="hover:text-foreground">
              Pricing
            </a>
            <a href="#faq" className="hover:text-foreground">
              FAQ
            </a>
            <Link href="/login" className="hover:text-foreground">
              Sign in
            </Link>
          </div>
          <div className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} ClinicOS · All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}
