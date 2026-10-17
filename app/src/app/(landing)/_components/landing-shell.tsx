"use client";

import { useState } from "react";
import { Barlow_Condensed, DM_Sans } from "next/font/google";
import "./landing.css";
import { Navbar } from "./navbar";
import { Hero } from "./hero";
import { Marquee } from "./marquee";
import { PublicTournaments } from "./public-tournaments";
import { Roles } from "./roles";
import { HowItWorks } from "./how-it-works";
import { Effort } from "./effort";
import { CtaFinal } from "./cta-final";
import { Footer } from "./footer";
import { AuthModal } from "./auth-modal";
import type { ProfileRole } from "@/_lib/profiles";

// Las fuentes del lineamiento de la landing (especificación 013): solo se cargan acá.
const display = Barlow_Condensed({ variable: "--font-lc-display", subsets: ["latin"], weight: ["600", "700", "800"] });
const body = DM_Sans({ variable: "--font-lc-body", subsets: ["latin"], weight: ["400", "500", "600", "700"] });

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
    <div className={`lc ${display.variable} ${body.variable} min-h-screen overflow-x-hidden`}>
      <Navbar onOpenAuth={openAuth} />
      <Hero onOpenAuth={openAuth} />
      <Marquee />
      <PublicTournaments />
      <Roles />
      <HowItWorks />
      <Effort />
      <CtaFinal onOpenAuth={openAuth} />
      <Footer />
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} initialView={authView} next={next} initialRoles={initialRoles} />
    </div>
  );
}
