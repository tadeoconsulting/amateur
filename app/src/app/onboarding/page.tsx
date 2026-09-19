"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { MobileShell } from "@/_components/mobile-shell";
import { BackHeader } from "@/_components/back-header";

const slides = [
  {
    title: "Únete a la comunidad",
    description:
      "Registra tu organización en la comunidad futbolera y crea los torneos futboleros más importantes de tu comunidad.",
    graphic: "/onboarding/graphic.svg",
  },
  {
    title: "Gestiona tus torneos",
    description:
      "Crea fixtures automáticos, registra resultados en vivo y mantén la tabla de posiciones actualizada sin esfuerzo.",
    graphic: "/onboarding/graphic.svg",
  },
  {
    title: "Todo en un solo lugar",
    description:
      "Clubes, jugadores, estadísticas e historial. Todo conectado y accesible desde cualquier dispositivo.",
    graphic: "/onboarding/graphic.svg",
  },
];

export default function OnboardingPage() {
  const [current, setCurrent] = useState(0);
  const slide = slides[current];

  return (
    <MobileShell>
      <BackHeader onBack={() => (current > 0 ? setCurrent(current - 1) : window.history.back())} />

      {/* Content */}
      <div className="flex flex-1 flex-col items-center px-4 pt-8 pb-6">
        <h1 className="font-heading text-[22px] font-bold leading-[26px] text-text-primary text-center">
          {slide.title}
        </h1>

        <div className="mt-4 flex items-center justify-center">
          <Image
            src={slide.graphic}
            alt=""
            width={271}
            height={200}
            priority
          />
        </div>

        <p className="mt-4 max-w-[328px] text-center font-body text-base leading-[22px] text-text-primary">
          {slide.description}
        </p>

        {/* Carousel indicators */}
        <div className="mt-4 flex items-center gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              aria-label={`Slide ${i + 1}`}
              className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                i === current
                  ? "bg-verification"
                  : "border border-border-primary bg-transparent"
              }`}
            >
              <Image
                src={i === current ? "/onboarding/icon-tournament-active.svg" : "/onboarding/icon-tournament.svg"}
                alt=""
                width={24}
                height={24}
              />
            </button>
          ))}
        </div>
      </div>

      {/* Bottom buttons */}
      <div className="sticky bottom-0 flex gap-4 px-4 py-8">
        <Link
          href="/login"
          className="flex flex-1 items-center justify-center rounded border border-border-primary px-3 py-3 font-heading text-sm text-text-primary transition-colors hover:bg-brand-300"
        >
          Inicia sesión
        </Link>
        <Link
          href="/registro"
          className="flex flex-1 items-center justify-center rounded bg-btn-primary px-3 py-3 font-heading text-sm text-text-invert transition-colors hover:bg-btn-secondary"
        >
          Crear una cuenta
        </Link>
      </div>
    </MobileShell>
  );
}
