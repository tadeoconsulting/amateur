"use client";

import { useEffect, useRef } from "react";

/**
 * Pestañas en forma de píldora — el estilo de las fechas del fixture. Es la única definición: el
 * fixture, los resultados (tabla/goleadores) y las secciones del torneo del club la usan, así todas
 * las pestañas secundarias se ven y se comportan igual.
 *
 * Cuando hay muchas, la barra se desplaza de lado y la elegida queda centrada a la vista.
 */
export function PillTabs<K extends string>({
  tabs,
  value,
  onChange,
  label,
  className = "px-4 pb-3",
}: {
  tabs: { key: K; label: string }[];
  value: K;
  onChange: (key: K) => void;
  /** Nombre de la barra para quien usa lector de pantalla ("Fechas del torneo"). */
  label: string;
  /** Márgenes de la barra; por omisión el de un contenedor sin padding (`FixtureTabs`). */
  className?: string;
}) {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = barRef.current?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ inline: "center", block: "nearest", behavior: reduce ? "auto" : "smooth" });
  }, [value]);

  return (
    <div ref={barRef} role="tablist" aria-label={label} className={`no-scrollbar flex gap-2 overflow-x-auto ${className}`}>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          role="tab"
          aria-selected={value === tab.key}
          onClick={() => onChange(tab.key)}
          className={`min-h-11 shrink-0 cursor-pointer rounded-lg px-4 py-2 font-heading text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary ${
            value === tab.key ? "bg-surface-secondary text-text-invert" : "border border-border-primary text-text-primary"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
