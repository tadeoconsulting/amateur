"use client";

import { useState } from "react";

interface Token {
  css: string;
  tailwind: string;
  value: string;
  desc: string;
}

const tokenGroups: { title: string; tokens: Token[] }[] = [
  {
    title: "Primitives — Brand",
    tokens: [
      { css: "--color-brand-100", tailwind: "brand-100", value: "#FDFDFD", desc: "Lightest neutral" },
      { css: "--color-brand-200", tailwind: "brand-200", value: "#E5E5E5", desc: "Light gray" },
      { css: "--color-brand-300", tailwind: "brand-300", value: "#EBEBEB", desc: "Soft gray" },
      { css: "--color-brand-500", tailwind: "brand-500", value: "#6D6D6D", desc: "Mid gray" },
      { css: "--color-brand-700", tailwind: "brand-700", value: "#4D4D4D", desc: "Dark gray" },
      { css: "--color-brand-900", tailwind: "brand-900", value: "#1B1B1B", desc: "Near black" },
    ],
  },
  {
    title: "Primitives — Complementary",
    tokens: [
      { css: "--color-green", tailwind: "green", value: "#00CA81", desc: "Green accent" },
      { css: "--color-yellow", tailwind: "yellow", value: "#F8E294", desc: "Yellow / warning" },
      { css: "--color-red", tailwind: "red", value: "#FF6363", desc: "Red / error" },
    ],
  },
  {
    title: "Semantic — Text",
    tokens: [
      { css: "--color-text-primary", tailwind: "text-primary", value: "#1B1B1B", desc: "Default text color" },
      { css: "--color-text-secondary", tailwind: "text-secondary", value: "#6D6D6D", desc: "Secondary / muted text" },
      { css: "--color-text-invert", tailwind: "text-invert", value: "#FAFAFA", desc: "Text on dark surfaces" },
    ],
  },
  {
    title: "Semantic — Surface",
    tokens: [
      { css: "--color-surface-primary", tailwind: "surface-primary", value: "#FAFAFA", desc: "Main background" },
      { css: "--color-surface-secondary", tailwind: "surface-secondary", value: "#1B1B1B", desc: "Dark surface (headers, sidebar)" },
      { css: "--color-surface-alt", tailwind: "surface-alt", value: "#FDFDFD", desc: "Alternative / card bg" },
    ],
  },
  {
    title: "Semantic — Border",
    tokens: [
      { css: "--color-border-primary", tailwind: "border-primary", value: "#1B1B1B", desc: "Primary borders / outlines" },
      { css: "--color-border-secondary", tailwind: "border-secondary", value: "#4D4D4D", desc: "Secondary borders" },
    ],
  },
  {
    title: "Semantic — Buttons",
    tokens: [
      { css: "--color-btn-primary", tailwind: "btn-primary", value: "#1B1B1B", desc: "Primary button background" },
      { css: "--color-btn-secondary", tailwind: "btn-secondary", value: "#4D4D4D", desc: "Secondary / hover state" },
      { css: "--color-btn-regular", tailwind: "btn-regular", value: "#EBEBEB", desc: "Regular button / input bg" },
      { css: "--color-btn-disabled", tailwind: "btn-disabled", value: "#E5E5E5", desc: "Disabled state" },
    ],
  },
  {
    title: "Semantic — Accent",
    tokens: [
      { css: "--color-error", tailwind: "error", value: "#FF6363", desc: "Error states" },
      { css: "--color-verification", tailwind: "verification", value: "#00CA81", desc: "Success / verified states" },
    ],
  },
  {
    title: "Typography",
    tokens: [
      { css: "--font-sans", tailwind: "font-sans", value: "Inter", desc: "Default UI sans-serif" },
      { css: "--font-heading", tailwind: "font-heading", value: "Lexend", desc: "Headings, buttons, labels" },
      { css: "--font-body", tailwind: "font-body", value: "Lato", desc: "Body text, paragraphs" },
    ],
  },
];

export default function TokensPage() {
  const [search, setSearch] = useState("");

  const filtered = tokenGroups
    .map((group) => ({
      ...group,
      tokens: group.tokens.filter(
        (t) =>
          t.css.toLowerCase().includes(search.toLowerCase()) ||
          t.tailwind.toLowerCase().includes(search.toLowerCase()) ||
          t.desc.toLowerCase().includes(search.toLowerCase())
      ),
    }))
    .filter((g) => g.tokens.length > 0);

  return (
    <>
      <header className="mb-10">
        <p className="text-xs font-semibold tracking-[0.08em] text-verification uppercase">
          Foundations
        </p>
        <h1 className="mt-2 font-heading text-3xl font-bold text-text-primary">
          Tokens
        </h1>
        <p className="mt-3 max-w-xl font-body text-base leading-relaxed text-text-secondary">
          Referencia completa de todos los design tokens definidos en Crono DS.
          Cada token tiene su variable CSS y su clase Tailwind correspondiente.
        </p>
      </header>

      {/* Search */}
      <div className="mb-8">
        <input
          type="text"
          placeholder="Buscar token..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-brand-200 bg-white px-4 py-2.5 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-border-primary"
        />
      </div>

      {/* Token groups */}
      <div className="space-y-10">
        {filtered.map((group) => (
          <section key={group.title}>
            <h2 className="mb-3 text-xs font-semibold tracking-[0.08em] text-text-secondary uppercase">
              {group.title}
            </h2>
            <div className="overflow-x-auto rounded-xl border border-brand-200 bg-white">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-brand-200 text-[10px] text-text-secondary uppercase tracking-wider">
                    <th className="px-4 py-2.5 font-medium">Swatch</th>
                    <th className="px-4 py-2.5 font-medium">CSS Variable</th>
                    <th className="px-4 py-2.5 font-medium">Tailwind</th>
                    <th className="px-4 py-2.5 font-medium">Valor</th>
                    <th className="px-4 py-2.5 font-medium">Descripción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-200">
                  {group.tokens.map((t) => (
                    <tr key={t.css} className="hover:bg-brand-100 transition-colors">
                      <td className="px-4 py-2.5">
                        {t.value.startsWith("#") ? (
                          <div
                            className="h-7 w-7 rounded border border-brand-200"
                            style={{ backgroundColor: t.value }}
                          />
                        ) : (
                          <span className="text-xs text-text-secondary">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs text-text-primary">
                        {t.css}
                      </td>
                      <td className="px-4 py-2.5">
                        <code className="rounded bg-brand-300 px-1.5 py-0.5 text-xs text-text-secondary">
                          {t.tailwind}
                        </code>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs text-text-secondary">
                        {t.value}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-text-secondary">
                        {t.desc}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="mt-8 text-center text-sm text-text-secondary">
          No se encontraron tokens para &ldquo;{search}&rdquo;
        </p>
      )}
    </>
  );
}
