"use client";

import { PillTabs } from "@/_components/pill-tabs";

/**
 * Las pestañas secundarias de una pantalla (categorías, género, Libre / Sub 18...). En el celular
 * siguen siendo las de siempre, con el subrayado; en escritorio (desde 768 px, donde aparece la barra
 * superior) pasan a ser `PillTabs`, el mismo estilo que las fechas del fixture y las secciones del
 * torneo, para que todas las pestañas secundarias se vean igual.
 *
 * - `equal`: las pestañas se reparten todo el ancho (equipo, jugadores).
 * - `start`: pegadas a la izquierda, con la letra un poco más chica (Libre / Sub 18).
 */
export function SubTabs<K extends string>({
  tabs,
  value,
  onChange,
  label,
  mobile = "equal",
  className = "mt-4",
}: {
  tabs: { key: K; label: string }[];
  value: K;
  onChange: (key: K) => void;
  /** Nombre de la barra para quien usa lector de pantalla. */
  label: string;
  mobile?: "equal" | "start";
  /** Márgenes de afuera (el espacio sobre la barra). */
  className?: string;
}) {
  return (
    <div className={className}>
      <div className={`md:hidden ${mobile === "equal" ? "flex border-b border-brand-200 px-4" : "flex gap-4 border-b border-border-primary px-4"}`}>
        {tabs.map((tab) => {
          const active = value === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => onChange(tab.key)}
              className={
                mobile === "equal"
                  ? `flex-1 cursor-pointer py-2.5 text-center text-sm font-medium transition-colors ${active ? "border-b-2 border-brand-900 text-text-primary" : "text-text-secondary"}`
                  : `cursor-pointer pb-2 font-body text-sm transition-colors ${active ? "border-b-2 border-text-primary font-semibold text-text-primary" : "text-text-secondary"}`
              }
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <div className="hidden md:block">
        <PillTabs tabs={tabs} value={value} onChange={onChange} label={label} className="px-4 pb-1" />
      </div>
    </div>
  );
}
