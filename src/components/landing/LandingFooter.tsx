"use client";

import Link from "next/link";
import { Logo } from "@/components/shared/Logo";
import {
  Mail,
  Phone,
  MessageCircle,
  MapPin,
  Heart,
} from "lucide-react";

export function LandingFooter() {
  return (
    <footer className="border-t bg-muted/30">
      {/* Compact 3-column layout */}
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="grid gap-6 md:grid-cols-3">
          {/* Brand */}
          <div>
            <Logo />
            <p className="mt-2 max-w-xs text-xs leading-relaxed text-muted-foreground">
              All-in-one software for clinics in Pakistan — tokens,
              consultations, pharmacy, billing.
            </p>
          </div>

          {/* Product */}
          <div>
            <FooterTitle>Product</FooterTitle>
            <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-sm">
              <FooterLink href="#features">Features</FooterLink>
              <FooterLink href="#pricing">Pricing</FooterLink>
              <FooterLink href="#faq">FAQ</FooterLink>
              <FooterLink href="/login">Sign in</FooterLink>
              <FooterLink href="/register">Free trial</FooterLink>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <FooterTitle>Contact</FooterTitle>
            <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground">
              <li className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 shrink-0 text-primary" />
                <a
                  href="mailto:hello@clinicos.app"
                  className="hover:text-foreground"
                >
                  hello@clinicos.app
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 shrink-0 text-primary" />
                <a
                  href="tel:+923000000000"
                  className="hover:text-foreground"
                >
                  +92 300 000 0000
                </a>
              </li>
              <li className="flex items-center gap-2">
                <MessageCircle className="h-3.5 w-3.5 shrink-0 text-primary" />
                <a
                  href="https://wa.me/923000000000"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground"
                >
                  WhatsApp support
                </a>
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
                <span>Lahore, Pakistan</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-6 flex flex-col items-start justify-between gap-2 border-t pt-4 text-[11px] text-muted-foreground md:flex-row md:items-center">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>
              © {new Date().getFullYear()} ClinicOS
            </span>
            <Link href="/privacy" className="hover:text-foreground">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-foreground">
              Terms
            </Link>
          </div>
          <div className="inline-flex items-center gap-1.5">
            Built with{" "}
            <Heart className="h-3 w-3 fill-destructive text-destructive" /> in
            Lahore
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
  const cls =
    "text-muted-foreground transition hover:text-foreground whitespace-nowrap";
  if (href.startsWith("#")) {
    return (
      <li>
        <a href={href} className={cls}>
          {children}
        </a>
      </li>
    );
  }
  return (
    <li>
      <Link href={href} className={cls}>
        {children}
      </Link>
    </li>
  );
}
