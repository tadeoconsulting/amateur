"use client";

import { useEffect, useRef, useState } from "react";
import { ScrollReveal } from "./scroll-reveal";

function Counter({ end, suffix = "", duration = 1500 }: { end: number; suffix?: string; duration?: number }) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;

          if (prefersReducedMotion) {
            setValue(end);
            return;
          }

          const startTime = performance.now();
          const animate = (now: number) => {
            const progress = Math.min((now - startTime) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setValue(Math.round(eased * end));
            if (progress < 1) requestAnimationFrame(animate);
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [end, duration]);

  return (
    <span ref={ref}>
      {value.toLocaleString("es-PE")}
      {suffix}
    </span>
  );
}

const stats = [
  { value: 2000, suffix: "+", label: "Torneos anuales en Lima" },
  { value: 8000, suffix: "+", label: "Clubes y academias" },
  { value: 3500000, suffix: "", label: "Deportistas amateurs activos", display: "3.5M" },
  { value: 500, suffix: "+", label: "Torneos meta año 3" },
];

export function Stats() {
  return (
    <section id="numeros" className="py-20 sm:py-28 px-4 sm:px-6 bg-field-light relative overflow-hidden">
      {/* Subtle field pattern */}
      <div className="absolute inset-0 pointer-events-none opacity-30">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-full bg-field-green/20" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full border border-field-green/15" />
      </div>

      <div className="max-w-5xl mx-auto relative z-10">
        <ScrollReveal className="text-center mb-16">
          <p className="text-sm font-bold text-field-green uppercase tracking-widest mb-3 font-heading">
            El mercado
          </p>
          <h2 className="font-heading text-3xl sm:text-5xl font-bold text-text-primary leading-tight">
            El fútbol amateur
            <br className="hidden sm:block" />
            es enorme
          </h2>
        </ScrollReveal>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {stats.map((stat, i) => (
            <ScrollReveal key={stat.label} delay={i * 100}>
              <div className="text-center">
                <p className="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold text-surface-secondary mb-2">
                  {stat.display ? (
                    stat.display
                  ) : (
                    <Counter end={stat.value} suffix={stat.suffix} />
                  )}
                </p>
                <p className="text-xs sm:text-sm text-text-secondary font-body">{stat.label}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
