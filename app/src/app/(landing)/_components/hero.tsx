"use client";

import { useEffect, useRef } from "react";
import { FieldSvg, BallSvg } from "./field-svg";

export function Hero({ onOpenAuth }: { onOpenAuth: (view: "login" | "register") => void }) {
  const ballRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion || !ballRef.current) return;

    let frame: number;
    let t = 0;
    const animate = () => {
      t += 0.008;
      if (ballRef.current) {
        ballRef.current.style.transform = `translateY(${Math.sin(t) * 12}px) rotate(${t * 15}deg)`;
      }
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden">
      {/* Background field lines */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <FieldSvg className="w-[120%] max-w-[1400px] text-field-green opacity-40" />
      </div>

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-b from-surface-primary via-surface-primary/90 to-field-light/30 pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-surface-primary to-transparent pointer-events-none" />

      {/* Floating ball */}
      <div ref={ballRef} className="absolute top-24 right-[10%] sm:right-[15%] lg:right-[20%]">
        <BallSvg className="w-16 h-16 sm:w-20 sm:h-20 lg:w-28 lg:h-28 text-field-green" />
      </div>

      {/* Small decorative balls */}
      <div className="absolute bottom-32 left-[8%] animate-[float_4s_ease-in-out_infinite]">
        <BallSvg className="w-8 h-8 text-brand-500 opacity-30" />
      </div>
      <div className="absolute top-[40%] left-[5%] animate-[float_5s_ease-in-out_infinite_1s]">
        <BallSvg className="w-6 h-6 text-field-green opacity-20" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 text-center">
        <div className="inline-flex items-center gap-2 bg-field-light text-field-dark text-xs sm:text-sm font-bold px-4 py-1.5 rounded-full mb-6 border border-field-green/20">
          <span className="w-2 h-2 rounded-full bg-field-green animate-pulse" />
          Plataforma de fútbol amateur
        </div>

        <h1 className="font-heading text-5xl sm:text-6xl lg:text-8xl font-bold text-text-primary leading-[0.95] tracking-tight mb-6">
          Tu torneo,
          <br />
          <span className="text-field-green">tu cancha</span>
        </h1>

        <p className="text-lg sm:text-xl text-text-secondary max-w-xl mx-auto mb-10 font-body leading-relaxed">
          Crea torneos, gestiona equipos y da seguimiento a cada gol, tarjeta y minuto jugado.
          Todo en un solo lugar.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => onOpenAuth("register")}
            className="w-full sm:w-auto text-base font-bold bg-surface-secondary text-text-invert px-8 py-4 rounded-full hover:bg-brand-700 transition-colors cursor-pointer"
          >
            Crear mi torneo gratis
          </button>
          <a
            href="#features"
            className="w-full sm:w-auto text-base font-medium text-text-primary border-2 border-border-primary px-8 py-4 rounded-full hover:bg-brand-900 hover:text-text-invert transition-colors cursor-pointer text-center"
          >
            Ver características
          </a>
        </div>
      </div>
    </section>
  );
}
