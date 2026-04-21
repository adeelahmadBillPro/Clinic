import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import NextTopLoader from "nextjs-toploader";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "ClinicOS — Run your clinic like a pro",
  description:
    "Multi-tenant clinic management: reception, tokens, doctor dashboards, pharmacy, IPD, lab, billing, analytics — in one place.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
      style={{ fontFamily: "var(--font-geist-sans), system-ui, sans-serif" }}
    >
      <body className="antialiased">
        <NextTopLoader
          color="#0F6E56"
          height={3}
          showSpinner={false}
          shadow="0 0 10px rgba(15, 110, 86, 0.6), 0 0 6px rgba(15, 110, 86, 0.4)"
          speed={300}
          crawlSpeed={200}
          initialPosition={0.12}
          easing="cubic-bezier(0.22, 1, 0.36, 1)"
        />
        {children}
        <Toaster richColors position="top-right" closeButton />
      </body>
    </html>
  );
}
