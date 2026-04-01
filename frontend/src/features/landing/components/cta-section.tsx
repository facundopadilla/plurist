"use client";

import { Button } from "@/components/ui/button";
import { LampContainer } from "../lib/aceternity/lamp";

export function CtaSection() {
  return (
    <section className="py-24 sm:py-32 bg-background">
      <LampContainer>
        <h2 className="text-display text-foreground text-center">
          Ready to create content from code?
        </h2>
        <p className="paper-lead text-center mx-auto mt-4 max-w-xl">
          Start building with Plurist today. No credit card required.
        </p>
        <div className="mt-8">
          <Button size="lg" className="px-8 text-base" asChild>
            <a href="/login">Get started free</a>
          </Button>
        </div>
      </LampContainer>
    </section>
  );
}
