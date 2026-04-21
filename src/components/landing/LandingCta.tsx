"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function LandingCta() {
  return (
    <section className="relative overflow-hidden py-20">
      <div className="relative mx-auto max-w-5xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, margin: "-80px" }}
          className="relative overflow-hidden rounded-2xl auth-hero-bg p-12 text-center text-white"
        >
          <div className="pointer-events-none absolute inset-0 opacity-30 mix-blend-overlay [background-image:radial-gradient(white_1px,transparent_1px)] [background-size:24px_24px]" />
          <h2 className="relative text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Start your 10-day free trial today.
          </h2>
          <p className="relative mt-3 text-white/80">
            No credit card required. You&rsquo;ll be running the clinic on
            ClinicOS within the hour.
          </p>
          <div className="relative mt-7">
            <Link
              href="/register"
              className={cn(
                buttonVariants({ size: "lg" }),
                "h-12 bg-white px-6 text-base text-primary hover:bg-white/90",
              )}
            >
              Start free trial
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
