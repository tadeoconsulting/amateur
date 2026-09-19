"use client";

import { useState } from "react";
import { Navbar } from "./navbar";
import { Hero } from "./hero";
import { Marquee } from "./marquee";
import { Features } from "./features";
import { HowItWorks } from "./how-it-works";
import { Stats } from "./stats";
import { CtaFinal } from "./cta-final";
import { Footer } from "./footer";
import { AuthModal } from "./auth-modal";

export function LandingShell() {
  const [authOpen, setAuthOpen] = useState(false);
  const [authView, setAuthView] = useState<"login" | "register">("login");

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
      <Stats />
      <CtaFinal onOpenAuth={openAuth} />
      <Footer />
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} initialView={authView} />
    </div>
  );
}
