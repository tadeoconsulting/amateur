"use client";

import { useState } from "react";

interface ColorToken {
  name: string;
  cssVar: string;
  hex: string;
}

const primitives: ColorToken[] = [
  { name: "brand/100", cssVar: "--color-brand-100", hex: "#FDFDFD" },
  { name: "brand/200", cssVar: "--color-brand-200", hex: "#E5E5E5" },
  { name: "brand/300", cssVar: "--color-brand-300", hex: "#EBEBEB" },
  { name: "brand/500", cssVar: "--color-brand-500", hex: "#6D6D6D" },
  { name: "brand/700", cssVar: "--color-brand-700", hex: "#4D4D4D" },
  { name: "brand/900", cssVar: "--color-brand-900", hex: "#1B1B1B" },
  { name: "complementary/green", cssVar: "--color-green", hex: "#00CA81" },
  { name: "complementary/yellow", cssVar: "--color-yellow", hex: "#F8E294" },
  { name: "complementary/red", cssVar: "--color-red", hex: "#FF6363" },
  { name: "white/100", cssVar: "—", hex: "#FEFEFE" },
  { name: "white/200", cssVar: "—", hex: "#FAFAFA" },
];

const semanticGroups: { title: string; tokens: ColorToken[] }[] = [
  {
    title: "Text",
    tokens: [
      { name: "text-primary", cssVar: "--color-text-primary", hex: "#1B1B1B" },
      { name: "text-secondary", cssVar: "--color-text-secondary", hex: "#6D6D6D" },
      { name: "text-invert", cssVar: "--color-text-invert", hex: "#FAFAFA" },
    ],
  },
  {
    title: "Surface",
    tokens: [
      { name: "surface-primary", cssVar: "--color-surface-primary", hex: "#FAFAFA" },
      { name: "surface-secondary", cssVar: "--color-surface-secondary", hex: "#1B1B1B" },
      { name: "surface-alt", cssVar: "--color-surface-alt", hex: "#FDFDFD" },
    ],
  },
  {
    title: "Border",
    tokens: [
      { name: "border-primary", cssVar: "--color-border-primary", hex: "#1B1B1B" },
      { name: "border-secondary", cssVar: "--color-border-secondary", hex: "#4D4D4D" },
    ],
  },
  {
    title: "Buttons",
    tokens: [
      { name: "btn-primary", cssVar: "--color-btn-primary", hex: "#1B1B1B" },
      { name: "btn-secondary", cssVar: "--color-btn-secondary", hex: "#4D4D4D" },
      { name: "btn-regular", cssVar: "--color-btn-regular", hex: "#EBEBEB" },
      { name: "btn-disabled", cssVar: "--color-btn-disabled", hex: "#E5E5E5" },
    ],
  },
  {
    title: "Accent",
    tokens: [
      { name: "error", cssVar: "--color-error", hex: "#FF6363" },
      { name: "verification", cssVar: "--color-verification", hex: "#00CA81" },
    ],
  },
];

function isLight(hex: string): boolean {
  const c = hex.replace("#", "");
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 160;
}

function Swatch({ token }: { token: ColorToken }) {
  const [copied, setCopied] = useState(false);
  const light = isLight(token.hex);

  function copy() {
    navigator.clipboard.writeText(token.hex);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  return (
    <button
      onClick={copy}
      className="group flex flex-col overflow-hidden rounded-lg border border-brand-200 text-left transition-shadow hover:shadow-md"
    >
      <div
        className="relative flex h-20 items-end p-3"
        style={{ backgroundColor: token.hex }}
      >
        <span
          className={`text-xs font-medium ${light ? "text-brand-900" : "text-white"}`}
        >
          {copied ? "Copied!" : token.hex}
        </span>
      </div>
      <div className="bg-white px-3 py-2.5">
        <p className="text-xs font-semibold text-text-primary">{token.name}</p>
        <p className="mt-0.5 font-mono text-[10px] text-text-secondary">
          {token.cssVar}
        </p>
      </div>
    </button>
  );
}

function TokenRow({ token }: { token: ColorToken }) {
  const [copied, setCopied] = useState(false);
  const light = isLight(token.hex);

  function copy() {
    navigator.clipboard.writeText(token.hex);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  return (
    <button
      onClick={copy}
      className="flex w-full items-center gap-4 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-brand-100"
    >
      <div
        className="h-10 w-10 shrink-0 rounded-md border border-brand-200"
        style={{ backgroundColor: token.hex }}
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-text-primary">{token.name}</p>
        <p className="font-mono text-xs text-text-secondary">{token.cssVar}</p>
      </div>
      <span className="shrink-0 font-mono text-xs text-text-secondary">
        {copied ? "Copied!" : token.hex}
      </span>
    </button>
  );
}

/** Los tokens que cambian en el tema «Cancha» (especificación 020): [token, claro, cancha]. Salen de globals.css. */
const canchaTokens: [string, string, string][] = [
  ["surface-primary", "#FAFAFA", "#101512"],
  ["surface-alt", "#FDFDFD", "#1b221d"],
  ["surface-secondary (inversa)", "#1B1B1B", "#c3fa73"],
  ["text-primary", "#1B1B1B", "#f3f4ed"],
  ["text-secondary", "#6D6D6D", "#adb5ad"],
  ["text-invert", "#FAFAFA", "#132016"],
  ["border-primary", "#1B1B1B", "#344037"],
  ["border-secondary", "#4D4D4D", "#475449"],
  ["btn-regular", "#EBEBEB", "#232c26"],
  ["btn-secondary", "#4D4D4D", "#344037"],
  ["btn-disabled", "#E5E5E5", "#1b221d"],
  ["brand-100", "#FDFDFD", "#1b221d"],
  ["brand-200", "#E5E5E5", "#344037"],
  ["brand-300", "#EBEBEB", "#232c26"],
  ["brand-500", "#6D6D6D", "#7c887e"],
  ["brand-700 (hover de la inversa)", "#4D4D4D", "#d6ff94"],
  ["ink (texto sobre verde/amarillo)", "#1B1B1B", "#132016"],
];

function CanchaSection() {
  return (
    <section className="mt-14">
      <h2 className="mb-1 font-heading text-xl font-bold text-text-primary">Sistema Cancha</h2>
      <p className="max-w-xl font-body text-sm text-text-secondary">
        El lineamiento de la landing (oscuro, lima, Barlow Condensed y DM Sans) llevado a la app por ámbitos. Se activa con
        la clase <code className="font-mono text-xs">tema-cancha</code> en el contenedor del ámbito y redefine las variables{" "}
        <code className="font-mono text-xs">--c-*</code>; hoy lo usa el organizador. La variante{" "}
        <code className="font-mono text-xs">cancha:</code> sirve para un ajuste que solo vale dentro del tema.
      </p>

      <div className="mt-6 overflow-x-auto rounded-xl border border-brand-200 bg-white">
        <table className="w-full min-w-[420px] text-left text-sm">
          <thead>
            <tr className="border-b border-brand-200 text-xs font-semibold tracking-[0.08em] text-text-secondary uppercase">
              <th className="px-3 py-2.5">Token</th>
              <th className="px-3 py-2.5">Claro (Crono DS)</th>
              <th className="px-3 py-2.5">Cancha</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-200">
            {canchaTokens.map(([name, claro, cancha]) => (
              <tr key={name}>
                <td className="px-3 py-2 font-body text-text-primary">{name}</td>
                {[claro, cancha].map((hex) => (
                  <td key={hex} className="px-3 py-2">
                    <span className="inline-flex items-center gap-2 font-mono text-xs text-text-secondary">
                      <span className="h-5 w-5 rounded border border-brand-200" style={{ backgroundColor: hex }} />
                      {hex}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className="mt-8 mb-3 text-xs font-semibold tracking-[0.08em] text-text-secondary uppercase">Vista en vivo</h3>
      <div className="tema-cancha rounded-2xl border border-border-primary bg-surface-primary p-5">
        <p className="font-heading text-xl font-bold text-text-primary">Copa Apertura 2026</p>
        <p className="mt-1 font-body text-sm text-text-secondary">8 equipos · Liga · Estadio Central</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="min-h-11 rounded-lg bg-surface-secondary px-4 font-heading text-sm font-bold text-text-invert hover:bg-brand-700">Iniciar partido</button>
          <button className="min-h-11 rounded-lg border border-border-primary px-4 font-heading text-sm font-bold text-text-primary hover:bg-btn-regular">Editar torneo</button>
          <span className="inline-flex items-center rounded-full bg-verification px-2.5 py-1 font-heading text-xs font-bold text-ink">En vivo</span>
          <span className="inline-flex items-center rounded-full bg-yellow px-2.5 py-1 font-heading text-xs font-bold text-ink">Convocatoria</span>
        </div>
        <div className="mt-4 rounded-2xl border border-border-primary bg-surface-alt p-4">
          <p className="font-heading text-2xl font-bold text-surface-secondary">12</p>
          <p className="font-heading text-xs font-semibold text-text-primary">Partidos jugados</p>
          <p className="font-body text-[10px] text-text-secondary">Esta temporada</p>
        </div>
      </div>
    </section>
  );
}

export default function ColorPage() {
  return (
    <>
      <header className="mb-10">
        <p className="text-xs font-semibold tracking-[0.08em] text-verification uppercase">
          Foundations
        </p>
        <h1 className="mt-2 font-heading text-3xl font-bold text-text-primary">
          Color
        </h1>
        <p className="mt-3 max-w-xl font-body text-base leading-relaxed text-text-secondary">
          Paleta neutra (negro/blanco/gris) con un acento verde para estados
          positivos y de verificación. Click en cualquier swatch para copiar el
          valor HEX.
        </p>
      </header>

      {/* Primitives */}
      <section className="mb-14">
        <h2 className="font-heading text-xl font-bold text-text-primary">
          Primitives
        </h2>
        <p className="mt-1 font-body text-sm text-text-secondary">
          Los valores base del sistema. Los tokens semánticos referencian estas
          primitivas.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {primitives.map((t) => (
            <Swatch key={t.name} token={t} />
          ))}
        </div>
      </section>

      {/* Semantic tokens */}
      <section>
        <h2 className="mb-1 font-heading text-xl font-bold text-text-primary">
          Semantic Tokens
        </h2>
        <p className="font-body text-sm text-text-secondary">
          Colores nombrados por su función. Usar siempre el token semántico en
          la UI, no el primitivo directamente.
        </p>

        <div className="mt-8 space-y-10">
          {semanticGroups.map((group) => (
            <div key={group.title}>
              <h3 className="mb-3 text-xs font-semibold tracking-[0.08em] text-text-secondary uppercase">
                {group.title}
              </h3>
              <div className="rounded-xl border border-brand-200 bg-white divide-y divide-brand-200">
                {group.tokens.map((t) => (
                  <TokenRow key={t.name} token={t} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <CanchaSection />
    </>
  );
}
