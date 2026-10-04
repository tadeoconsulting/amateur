"use client";

import { useState } from "react";
import { Navbar } from "./navbar";
import { Hero } from "./hero";
import { Marquee } from "./marquee";
import { Features } from "./features";
import { HowItWorks } from "./how-it-works";
import { PublicTournaments } from "./public-tournaments";
import { Stats } from "./stats";
import { CtaFinal } from "./cta-final";
import { Footer } from "./footer";
import { AuthModal } from "./auth-modal";
import type { ProfileRole } from "@/_lib/profiles";

export function LandingShell({
  initialAuth,
  next = null,
  initialRoles = [],
}: {
  initialAuth?: "login" | "register";
  next?: string | null;
  initialRoles?: ProfileRole[];
}) {
  const [authOpen, setAuthOpen] = useState(initialAuth !== undefined);
  const [authView, setAuthView] = useState<"login" | "register">(initialAuth ?? "login");

  function openAuth(view: "login" | "register") {
    setAuthView(view);
    setAuthOpen(true);
  }

  return (
    <div className="min-h-screen bg-surface-primary overflow-x-hidden">
      <Navbar onOpenAuth={openAuth} />
      <Hero onOpenAuth={openAuth} />
      <Marquee />
      <Features />
      <HowItWorks />
      <PublicTournaments />
      <Stats />
      <CtaFinal onOpenAuth={openAuth} />
      <Footer />
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} initialView={authView} next={next} initialRoles={initialRoles} />
    </div>
  );
}
