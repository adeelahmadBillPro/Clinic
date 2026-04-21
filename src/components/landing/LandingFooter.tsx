"use client";

import Link from "next/link";
import { Logo } from "@/components/shared/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Mail,
  Phone,
  MessageCircle,
  MapPin,
  ShieldCheck,
  Heart,
  ArrowRight,
} from "lucide-react";

export function LandingFooter() {
  return (
    <footer className="border-t bg-muted/30">
      {/* Pre-footer CTA strip */}
      <div className="border-b bg-background/60 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-6 py-8 md:flex-row md:items-center">
          <div>
            <div className="text-lg font-semibold">
              Ready to simplify your clinic?
            </div>
            <div className="text-sm text-muted-foreground">
              10-day free trial. No credit card. Cancel anytime.
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/register"
              className="inline-flex h-10 items-center gap-1.5 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:shadow-md"
            >
              Start free trial
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="https://wa.me/923000000000?text=Hi%2C%20I%27d%20like%20a%20demo%20of%20ClinicOS"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center gap-1.5 rounded-full border bg-card px-5 text-sm font-semibold transition hover:bg-accent/60"
            >
              <MessageCircle className="h-4 w-4" />
              Book a demo on WhatsApp
            </a>
          </div>
        </div>
      </div>

      {/* Columns */}
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <Logo />
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
              ClinicOS is the all-in-one software for clinics and hospitals in
              Pakistan — tokens, consultations, pharmacy, lab, billing, IPD, all
              in one workspace.
            </p>

            <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-700">
              <ShieldCheck className="h-3.5 w-3.5" />
              Data encrypted · Daily backups · Clinic-isolated
            </div>
          </div>

          <div className="lg:col-span-2">
            <FooterTitle>Product</FooterTitle>
            <ul className="mt-3 space-y-2 text-sm">
              <FooterLink href="#features">Features</FooterLink>
              <FooterLink href="#pricing">Pricing</FooterLink>
              <FooterLink href="#how">How it works</FooterLink>
              <FooterLink href="#faq">FAQ</FooterLink>
              <FooterLink href="/login">Sign in</FooterLink>
              <FooterLink href="/register">Start free trial</FooterLink>
            </ul>
          </div>

          <div className="lg:col-span-3">
            <FooterTitle>Contact</FooterTitle>
            <ul className="mt-3 space-y-2.5 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <a
                  href="mailto:hello@clinicos.app"
                  className="hover:text-foreground"
                >
                  hello@clinicos.app
                </a>
              </li>
              <li className="flex items-start gap-2">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <a href="tel:+923000000000" className="hover:text-foreground">
                  +92 300 000 0000
                </a>
              </li>
              <li className="flex items-start gap-2">
                <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <a
                  href="https://wa.me/923000000000"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground"
                >
                  WhatsApp support
                </a>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>Lahore, Pakistan</span>
              </li>
            </ul>

          </div>

          <div className="lg:col-span-3">
            <FooterTitle>Product updates</FooterTitle>
            <p className="mt-3 text-sm text-muted-foreground">
              One email a month. New features, tips from other clinics, no
              fluff.
            </p>
            <form
              className="mt-3 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const data = new FormData(e.currentTarget);
                const email = String(data.get("email") ?? "");
                if (!email) return;
                // Silent acknowledge — real wiring can hit a newsletter API later
                (e.currentTarget as HTMLFormElement).reset();
                alert("Thanks — we'll be in touch.");
              }}
            >
              <Input
                type="email"
                name="email"
                required
                placeholder="you@clinic.com"
                className="h-10 flex-1"
              />
              <Button type="submit" size="sm" className="h-10 px-4">
                Join
              </Button>
            </form>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t pt-6 text-xs text-muted-foreground md:flex-row md:items-center">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>© {new Date().getFullYear()} ClinicOS. All rights reserved.</span>
            <Link href="/privacy" className="hover:text-foreground">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-foreground">
              Terms
            </Link>
          </div>
          <div className="inline-flex items-center gap-1.5">
            Built with <Heart className="h-3 w-3 fill-destructive text-destructive" />{" "}
            in Lahore, Pakistan
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
      {children}
    </div>
  );
}

function FooterLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  if (href.startsWith("#")) {
    return (
      <li>
        <a
          href={href}
          className="text-muted-foreground transition hover:text-foreground"
        >
          {children}
        </a>
      </li>
    );
  }
  return (
    <li>
      <Link
        href={href}
        className="text-muted-foreground transition hover:text-foreground"
      >
        {children}
      </Link>
    </li>
  );
}

