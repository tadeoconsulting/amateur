"use client";

import { useState } from "react";

function ClickFeedback({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const [clicked, setClicked] = useState(false);

  return (
    <div className={className}>
      {clicked && (
        <p className="mb-2 text-center text-[10px] font-medium text-verification animate-pulse">
          Click detectado
        </p>
      )}
      <div
        onClick={() => {
          setClicked(true);
          setTimeout(() => setClicked(false), 800);
        }}
      >
        {children}
      </div>
    </div>
  );
}

export default function ButtonsPage() {
  return (
    <>
      <header className="mb-10">
        <p className="text-xs font-semibold tracking-[0.08em] text-verification uppercase">
          Components
        </p>
        <h1 className="mt-2 font-heading text-3xl font-bold text-text-primary">
          Buttons
        </h1>
        <p className="mt-3 max-w-xl font-body text-base leading-relaxed text-text-secondary">
          Componentes interactivos importados desde la librería amateur 3.0 (IA).
          Todos los botones usan <code className="rounded bg-brand-300 px-1 text-xs">font-heading</code> (Lexend).
          Hacé click para probar cada variante.
        </p>
      </header>

      {/* Primary / Secondary */}
      <Section title="Primary / Secondary">
        <Variant label="primary / M">
          <ClickFeedback className="w-full">
            <button className="w-full rounded bg-btn-primary px-4 py-[11px] font-heading text-sm font-semibold text-text-invert transition-all hover:bg-btn-secondary active:scale-[0.98]">
              Button regular
            </button>
          </ClickFeedback>
        </Variant>
        <Variant label="primary / S">
          <ClickFeedback>
            <button className="rounded bg-btn-primary px-4 py-[7px] font-heading text-xs font-semibold text-text-invert transition-all hover:bg-btn-secondary active:scale-[0.98]">
              Button
            </button>
          </ClickFeedback>
        </Variant>
        <Variant label="secondary / M">
          <ClickFeedback className="w-full">
            <button className="w-full rounded border border-border-primary bg-transparent px-4 py-[10px] font-heading text-sm font-semibold text-text-primary transition-all hover:bg-brand-900 hover:text-text-invert active:scale-[0.98]">
              Button secondary
            </button>
          </ClickFeedback>
        </Variant>
        <Variant label="disabled / M">
          <button className="w-full cursor-not-allowed rounded bg-btn-disabled px-4 py-[11px] font-heading text-sm font-semibold text-text-secondary" disabled>
            Button disabled
          </button>
        </Variant>
      </Section>

      {/* Con ícono */}
      <Section title="Con ícono">
        <Variant label="iconText / M">
          <ClickFeedback className="w-full">
            <button className="flex w-full items-center justify-center gap-2 rounded bg-btn-primary px-4 py-[11px] font-heading text-sm font-semibold text-text-invert transition-all hover:bg-btn-secondary active:scale-[0.98]">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
                <path d="M10 6v4l2.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              Button + Ico
            </button>
          </ClickFeedback>
        </Variant>
        <Variant label="iconRight / M">
          <ClickFeedback className="w-full">
            <button className="group flex w-full items-center justify-between rounded bg-btn-primary px-4 py-[11px] font-heading text-sm font-semibold text-text-invert transition-all hover:bg-btn-secondary active:scale-[0.98]">
              <span>Button</span>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="transition-transform group-hover:translate-x-1">
                <path d="M7.5 4L13.5 10L7.5 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </ClickFeedback>
        </Variant>
        <Variant label="iconRight / S">
          <ClickFeedback>
            <button className="group inline-flex items-center gap-1 rounded bg-btn-primary px-4 py-[7px] font-heading text-xs font-semibold text-text-invert transition-all hover:bg-btn-secondary active:scale-[0.98]">
              <span>Button</span>
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none" className="transition-transform group-hover:translate-x-0.5">
                <path d="M7.5 4L13.5 10L7.5 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </ClickFeedback>
        </Variant>
      </Section>

      {/* Link y navegación */}
      <Section title="Link y navegación">
        <Variant label="link / M">
          <ClickFeedback>
            <button className="font-heading text-sm font-bold text-text-primary underline transition-colors hover:text-btn-secondary active:text-brand-500">
              Button link
            </button>
          </ClickFeedback>
        </Variant>
        <Variant label="button_back">
          <ClickFeedback>
            <button className="group inline-flex items-center gap-1 font-heading text-sm text-text-primary transition-colors hover:text-btn-secondary">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="rotate-180 transition-transform group-hover:-translate-x-1">
                <path d="M7.5 4L13.5 10L7.5 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Volver
            </button>
          </ClickFeedback>
        </Variant>
      </Section>

      {/* Club */}
      <Section title="Club">
        <Variant label="club / normal">
          <ClickFeedback className="w-full">
            <button className="flex w-full items-center justify-center gap-2 rounded bg-btn-regular px-4 py-[11px] font-heading text-sm font-semibold text-text-primary transition-all hover:bg-brand-200 active:scale-[0.98]">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 2L3 6v8l7 4 7-4V6l-7-4z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
              </svg>
              Agregar equipo
            </button>
          </ClickFeedback>
        </Variant>
        <Variant label="category / normal">
          <ClickFeedback className="w-full">
            <button className="flex w-full items-center justify-center gap-2 rounded border border-border-primary bg-transparent px-4 py-[11px] font-heading text-sm font-semibold text-text-primary transition-all hover:bg-brand-900 hover:text-text-invert active:scale-[0.98]">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 2L3 6v8l7 4 7-4V6l-7-4z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
              </svg>
              Agregar equipo
            </button>
          </ClickFeedback>
        </Variant>
      </Section>

      {/* Filtros */}
      <Section title="Filtros">
        <FilterButton label="filter / ícono derecha" iconPosition="right" />
        <FilterButton label="filter / ícono izquierda" iconPosition="left" />
      </Section>

      {/* Anatomy */}
      <section className="mt-14">
        <h2 className="font-heading text-xl font-bold text-text-primary">
          Anatomía
        </h2>
        <div className="mt-4 overflow-x-auto rounded-xl border border-brand-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-brand-200 text-[10px] text-text-secondary uppercase tracking-wider">
                <th className="px-4 py-2.5 font-medium">Propiedad</th>
                <th className="px-4 py-2.5 font-medium">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-200 text-xs">
              {[
                ["Font", "Lexend (font-heading)"],
                ["Border radius", "rounded (4px)"],
                ["Padding M", "11px 16px"],
                ["Padding S", "7px 16px"],
                ["Primary bg", "btn-primary (#1B1B1B)"],
                ["Primary text", "text-invert (#FAFAFA)"],
                ["Secondary bg", "transparent"],
                ["Secondary border", "border-primary (#1B1B1B)"],
                ["Disabled bg", "btn-disabled (#E5E5E5)"],
                ["Disabled text", "text-secondary (#6D6D6D)"],
              ].map(([prop, val]) => (
                <tr key={prop}>
                  <td className="px-4 py-2.5 font-medium text-text-primary">{prop}</td>
                  <td className="px-4 py-2.5 font-mono text-text-secondary">{val}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function FilterButton({ label, iconPosition }: { label: string; iconPosition: "left" | "right" }) {
  const [active, setActive] = useState(false);

  const chevron = (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" className={`transition-transform ${active ? "rotate-180" : ""}`}>
      <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  return (
    <Variant label={label}>
      <button
        onClick={() => setActive(!active)}
        className={`inline-flex items-center gap-1.5 rounded border px-3 py-[7px] font-heading text-xs transition-all active:scale-[0.97] ${
          active
            ? "border-border-primary bg-brand-900 text-text-invert"
            : "border-border-primary bg-transparent text-text-primary hover:bg-brand-300"
        }`}
      >
        {iconPosition === "left" && chevron}
        <span>Filtrar</span>
        {iconPosition === "right" && chevron}
      </button>
    </Variant>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-12">
      <h2 className="mb-4 font-heading text-xl font-bold text-text-primary">
        {title}
      </h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Variant({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-brand-200 bg-white p-4">
      <div className="flex min-h-[42px] w-full max-w-[380px] items-center justify-center rounded-lg bg-brand-100 p-3">
        {children}
      </div>
      <code className="shrink-0 rounded bg-brand-300 px-2 py-1 text-xs text-text-secondary">
        {label}
      </code>
    </div>
  );
}
