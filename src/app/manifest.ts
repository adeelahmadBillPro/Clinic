import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ClinicOS",
    short_name: "ClinicOS",
    description:
      "Run your clinic like a pro — reception, tokens, consultations, pharmacy, IPD, lab, and billing.",
    start_url: "/dashboard",
    // standalone removes the browser chrome when launched from home
    // screen — looks like a real native app.
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0F6E56",
    orientation: "portrait",
    // Icons are static SVGs in app/ — Next.js serves them from /icon.svg
    // and /apple-icon.svg. SVGs scale to any size the OS asks for, so
    // one file covers favicon, home-screen and PWA install all at once.
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
      {
        src: "/apple-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/apple-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
    categories: ["medical", "health", "productivity"],
  };
}
