"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Pestañas en forma de píldora — el estilo de las fechas del fixture. Es la única definición: el
 * fixture, los resultados (tabla/goleadores) y las secciones del torneo del club la usan, así todas
 * las pestañas secundarias se ven y se comportan igual.
 *
 * Cuando hay más de las que caben, la barra se desplaza de lado (nunca se parte en filas) y la
 * elegida queda centrada a la vista. Pensado para dedo y para ratón:
 * - **Táctil:** se desliza con el dedo.
 * - **Ratón:** aparecen flechas en los bordes — solo del lado donde hay más — con un degradado que
 *   muestra que la barra continúa. (Un ratón no desliza; sin flechas habría pestañas inalcanzables.)
 * - **Teclado:** flechas izquierda/derecha, Inicio y Fin cambian de pestaña (patrón de pestañas del
 *   estándar ARIA); solo la elegida está en el orden de Tab.
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
  // El cambio vino del teclado: al marcarse la pestaña nueva hay que darle también el foco.
  const focusAfterChange = useRef(false);
  // ¿Hay más pestañas escondidas a la izquierda / a la derecha?
  const [more, setMore] = useState({ left: false, right: false });

  const measure = () => {
    const el = barRef.current;
    if (!el) return;
    const left = el.scrollLeft > 4;
    const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 4;
    setMore((m) => (m.left === left && m.right === right ? m : { left, right }));
  };

  // Elegida a la vista, centrada (y con el foco, si la eligió el teclado).
  useEffect(() => {
    const el = barRef.current?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!el) return;
    if (focusAfterChange.current) {
      focusAfterChange.current = false;
      el.focus({ preventScroll: true });
    }
    el.scrollIntoView({ inline: "center", block: "nearest", behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }, [value]);

  // Vuelve a medir cuando cambia el tamaño de la barra o de sus pestañas (el observador avisa al empezar y en cada cambio).
  const count = tabs.length;
  useEffect(() => {
    const el = barRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => measure());
    observer.observe(el);
    Array.from(el.children).forEach((child) => observer.observe(child));
    return () => observer.disconnect();
  }, [count]);

  const scrollByPage = (direction: -1 | 1) => {
    const el = barRef.current;
    el?.scrollBy({ left: direction * el.clientWidth * 0.7, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const index = tabs.findIndex((t) => t.key === value);
    const next =
      e.key === "ArrowRight" ? Math.min(index + 1, tabs.length - 1)
      : e.key === "ArrowLeft" ? Math.max(index - 1, 0)
      : e.key === "Home" ? 0
      : e.key === "End" ? tabs.length - 1
      : null;
    if (next === null || next === index) return;
    e.preventDefault();
    focusAfterChange.current = true;
    onChange(tabs[next].key);
  };

  const arrow =
    "absolute top-0 hidden h-11 w-16 items-center [@media(hover:hover)]:flex"; // solo con ratón; con el dedo se desliza

  return (
    <div className="relative">
      <div
        ref={barRef}
        role="tablist"
        aria-label={label}
        onScroll={measure}
        onKeyDown={onKeyDown}
        className={`no-scrollbar flex gap-2 overflow-x-auto ${className}`}
      >
        {tabs.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            tabIndex={value === tab.key ? 0 : -1}
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

      {more.left && (
        <button
          type="button"
          tabIndex={-1}
          aria-hidden="true"
          onClick={() => scrollByPage(-1)}
          className={`${arrow} left-0 justify-start bg-linear-to-r from-surface-primary from-55% to-transparent pl-1`}
        >
          <Chevron direction="left" />
        </button>
      )}
      {more.right && (
        <button
          type="button"
          tabIndex={-1}
          aria-hidden="true"
          onClick={() => scrollByPage(1)}
          className={`${arrow} right-0 justify-end bg-linear-to-l from-surface-primary from-55% to-transparent pr-1`}
        >
          <Chevron direction="right" />
        </button>
      )}
    </div>
  );
}

function Chevron({ direction }: { direction: "left" | "right" }) {
  return (
    <span className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-border-primary bg-surface-primary text-text-primary shadow-sm transition-colors hover:bg-btn-regular">
      <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d={direction === "left" ? "M12.5 15L7.5 10l5-5" : "M7.5 5l5 5-5 5"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
