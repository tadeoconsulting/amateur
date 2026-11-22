"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { nextTabIndex, nextTabIndexWrapping } from "@/_lib/tabs";

/** Un tab. `count` es un contador junto al nombre (en `segmented`) o la bolita de pendientes (en `sections`); `leading` es un indicador antes del nombre (`filters` y `sections`). */
export type TabItem<K extends string = string> = { key: K; label: string; count?: number | string; leading?: ReactNode; disabled?: boolean };

type Common<K extends string> = {
  tabs: TabItem<K>[];
  /** El nombre del conjunto de tabs, para los lectores de pantalla («Fechas del torneo»). */
  label: string;
  value: K;
  onChange: (key: K) => void;
  /** Solo disposición (márgenes, relleno de la barra); el aspecto sale de la variante. */
  className?: string;
};

type SectionsProps<K extends string> = Common<K> & {
  variant?: "sections";
  /** `sm` (14 px, por omisión) o `base` (16 px, el nivel principal de «Mis torneos»). */
  size?: "sm" | "base";
  /** Acciones que NO son tabs y van a la derecha, siempre a la vista (por ejemplo, el menú «Acciones»). */
  trailing?: ReactNode;
};
type SegmentedProps<K extends string> = Common<K> & { variant: "segmented" };
type FiltersProps<K extends string> = Common<K> & { variant: "filters" };
type LandingProps<K extends string> = Common<K> & {
  variant: "landing";
  /** Para enlazar cada tarjeta con su panel (`aria-controls`) y reconocerlas: `${idPrefix}-${índice}`. */
  idPrefix: string;
  /** El `id` del panel que controlan. */
  panelId: string;
};

export type TabsProps<K extends string = string> = SectionsProps<K> | SegmentedProps<K> | FiltersProps<K> | LandingProps<K>;

/**
 * EL componente de tabs de la plataforma (especificación 024): un solo componente con cuatro variantes.
 *
 * - `sections` (por omisión): píldoras lima, desplazables con flechas. Para las **secciones** de una pantalla. `role="tab"` y el
 *   teclado de los tabs (← → Inicio Fin; solo el elegido está en el orden de Tab). `trailing` para acciones que no son tabs.
 * - `segmented`: una pista con el activo como tarjeta, con contador opcional. Para pocas opciones cortas de **segundo nivel**,
 *   dentro de un contenedor (género, «Calendario / Horarios / Lugares», estado de los partidos).
 * - `filters`: la misma píldora, como botones de activar y desactivar (`aria-pressed`), para **filtrar** («Todos / Clausura 2026»).
 * - `landing`: las tarjetas de la landing (colores `--lc-*`), con el mismo patrón accesible.
 */
export function Tabs<K extends string>(props: TabsProps<K>) {
  if (props.variant === "segmented") return <SegmentedTabs {...props} />;
  if (props.variant === "filters") return <FilterTabs {...props} />;
  if (props.variant === "landing") return <LandingTabs {...props} />;
  return <SectionTabs {...props} />;
}

const pill =
  "min-h-11 shrink-0 cursor-pointer rounded-lg px-4 py-2 font-body font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary disabled:cursor-not-allowed disabled:opacity-40";
const pillOn = "bg-surface-secondary text-text-invert";
const pillOff = "border border-border-primary text-text-primary";

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** El teclado de los tabs: ← → Inicio Fin cambian de tab y le dan el foco. */
function useTabKeys<K extends string>(tabs: TabItem<K>[], value: K, onChange: (key: K) => void, wrap = false) {
  // El cambio vino del teclado: al marcarse la pestaña nueva hay que darle también el foco.
  const focusAfterChange = useRef(false);
  // Quien pinta pregunta (una sola vez) si el último cambio vino del teclado, para darle el foco al tab nuevo.
  const takeFocusRequest = useCallback(() => {
    const pending = focusAfterChange.current;
    focusAfterChange.current = false;
    return pending;
  }, []);
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const index = tabs.findIndex((t) => t.key === value);
    const next = (wrap ? nextTabIndexWrapping : nextTabIndex)(e.key, index, tabs.length);
    if (next === null) return;
    e.preventDefault();
    focusAfterChange.current = true;
    onChange(tabs[next].key);
  };
  return { onKeyDown, takeFocusRequest };
}

// ———— sections ————

function SectionTabs<K extends string>({ tabs, label, value, onChange, className = "px-4 pb-3", size = "sm", trailing }: SectionsProps<K>) {
  const barRef = useRef<HTMLDivElement>(null);
  const [more, setMore] = useState({ left: false, right: false });
  const { onKeyDown, takeFocusRequest } = useTabKeys(tabs, value, onChange);

  const measure = () => {
    const el = barRef.current;
    if (!el) return;
    const left = el.scrollLeft > 4;
    const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 4;
    setMore((m) => (m.left === left && m.right === right ? m : { left, right }));
  };

  // La elegida a la vista, centrada (y con el foco, si la eligió el teclado).
  useEffect(() => {
    const el = barRef.current?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!el) return;
    if (takeFocusRequest()) el.focus({ preventScroll: true });
    el.scrollIntoView({ inline: "center", block: "nearest", behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }, [value, takeFocusRequest]);

  // Vuelve a medir cuando cambia el tamaño de la barra o de sus pestañas.
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

  const arrow = "absolute top-0 hidden h-11 w-16 items-center [@media(hover:hover)]:flex"; // solo con ratón; con el dedo se desliza
  const bar = (
    <div className="relative">
      <div ref={barRef} role="tablist" aria-label={label} onScroll={measure} onKeyDown={onKeyDown} className={`no-scrollbar flex gap-2 overflow-x-auto ${className}`}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            type="button"
            tabIndex={value === tab.key ? 0 : -1}
            aria-selected={value === tab.key}
            disabled={tab.disabled}
            onClick={() => onChange(tab.key)}
            className={`${pill} ${size === "base" ? "text-base" : "text-sm"} ${value === tab.key ? pillOn : pillOff}`}
          >
            {tab.leading}
            {tab.label}
            {/* Pendientes de la sección (por ejemplo, las solicitudes de un torneo): una bolita y el aviso para el lector de pantalla. */}
            {typeof tab.count === "number" && tab.count > 0 && (
              <>
                <span aria-hidden="true" className="ml-2 inline-flex min-w-5 items-center justify-center rounded-full bg-verification px-1.5 text-[11px] font-bold leading-5 text-ink">
                  {tab.count}
                </span>
                <span className="sr-only"> ({tab.count} pendientes)</span>
              </>
            )}
          </button>
        ))}
      </div>
      {more.left && (
        <button type="button" tabIndex={-1} aria-hidden="true" onClick={() => scrollByPage(-1)} className={`${arrow} left-0 justify-start bg-linear-to-r from-surface-primary from-55% to-transparent pl-1`}>
          <Chevron direction="left" />
        </button>
      )}
      {more.right && (
        <button type="button" tabIndex={-1} aria-hidden="true" onClick={() => scrollByPage(1)} className={`${arrow} right-0 justify-end bg-linear-to-l from-surface-primary from-55% to-transparent pr-1`}>
          <Chevron direction="right" />
        </button>
      )}
    </div>
  );

  if (!trailing) return bar;
  return (
    <div className="flex items-start gap-2">
      <div className="min-w-0 flex-1">{bar}</div>
      <div className="shrink-0 pr-4">{trailing}</div>
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

// ———— segmented ————

function SegmentedTabs<K extends string>({ tabs, label, value, onChange, className = "" }: SegmentedProps<K>) {
  const { onKeyDown, takeFocusRequest } = useTabKeys(tabs, value, onChange);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!takeFocusRequest()) return;
    ref.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.focus();
  }, [value, takeFocusRequest]);
  return (
    <div ref={ref} role="tablist" aria-label={label} onKeyDown={onKeyDown} className={`flex gap-1 rounded-xl bg-btn-regular p-1 ${className}`.trim()}>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          role="tab"
          type="button"
          tabIndex={value === tab.key ? 0 : -1}
          aria-selected={value === tab.key}
          disabled={tab.disabled}
          onClick={() => onChange(tab.key)}
          className={`flex min-h-10 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-2 py-2 font-body text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary disabled:cursor-not-allowed disabled:opacity-40 ${
            value === tab.key ? "bg-surface-primary text-text-primary shadow-sm" : "text-text-secondary hover:text-text-primary"
          }`}
        >
          {tab.label}
          {tab.count !== undefined && <span className="font-body tabular-nums text-text-secondary">{tab.count}</span>}
        </button>
      ))}
    </div>
  );
}

// ———— filters ————

function FilterTabs<K extends string>({ tabs, label, value, onChange, className = "px-4 pb-3" }: FiltersProps<K>) {
  return (
    <div role="group" aria-label={label} className={`no-scrollbar flex gap-2 overflow-x-auto ${className}`}>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          aria-pressed={value === tab.key}
          disabled={tab.disabled}
          onClick={() => onChange(tab.key)}
          className={`${pill} inline-flex items-center gap-1.5 text-sm ${value === tab.key ? pillOn : `${pillOff} hover:bg-btn-regular`}`}
        >
          {tab.leading}
          <span className="max-w-[180px] truncate">{tab.label}</span>
        </button>
      ))}
    </div>
  );
}

// ———— landing ————

function LandingTabs<K extends string>({ tabs, label, value, onChange, className = "", idPrefix, panelId }: LandingProps<K>) {
  const { onKeyDown, takeFocusRequest } = useTabKeys(tabs, value, onChange, true);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!takeFocusRequest()) return;
    ref.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.focus();
  }, [value, takeFocusRequest]);
  return (
    <div ref={ref} role="tablist" aria-label={label} onKeyDown={onKeyDown} className={className}>
      {tabs.map((tab, i) => (
        <button
          key={tab.key}
          id={`${idPrefix}-${i}`}
          role="tab"
          type="button"
          aria-selected={value === tab.key}
          aria-controls={panelId}
          tabIndex={value === tab.key ? 0 : -1}
          onClick={() => onChange(tab.key)}
          className={`flex shrink-0 snap-center cursor-pointer items-center justify-between gap-4 rounded-xl border px-4 py-4 text-left text-base transition-colors sm:min-w-[10.5rem] sm:px-5 sm:py-6 lg:min-w-0 ${
            value === tab.key ? "border-[var(--lc-lime)] bg-[var(--lc-lime)] font-semibold text-[var(--lc-ink)]" : "border-[var(--lc-line)] hover:border-[var(--lc-lime)]"
          }`}
        >
          {tab.label}
          <span aria-hidden="true" className="hidden sm:inline">↗</span>
        </button>
      ))}
    </div>
  );
}
