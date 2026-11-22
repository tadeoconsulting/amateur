"use client";

import { useState } from "react";
import { formatSolesAmount, monthLabel, monthShort, niceMax } from "@/_lib/club-fees";

// Los gráficos del dashboard (especificación 015, entrega 4), en SVG y sin librerías. Siguen la guía de la skill dataviz:
// una sola serie en un solo color (verde, validado contra el fondo: 3:1 o más), marcas finas con la punta redondeada de 4 px,
// líneas de 2 px, puntos de 8 px con un aro del color del fondo, rejilla de un pelo, el texto con los tokens de texto (nunca
// con el color de la serie), un tooltip al pasar, tocar o enfocar con el teclado y una vista de tabla para quien no ve los colores.

/** Verde de la serie: 3:1 contra el fondo #FAFAFA (el verde de marca, #00CA81, se queda en 2:1). */
export const SERIES = "#009B5F";
/** Un paso más claro del mismo verde: la "pista" de lo esperado. */
const TRACK = "#CDEBDD";
const GRID = "#E5E5E5";
const SURFACE = "#FAFAFA";

type Tip = { x: number; title: string; lines: string[] } | null;

/** El cuadro que aparece sobre un gráfico; `x` es el centro en % del ancho. */
function Tooltip({ tip }: { tip: Tip }) {
  if (!tip) return null;
  return (
    <div role="status" className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg bg-surface-secondary px-3 py-2 text-text-invert shadow-lg" style={{ left: `${Math.min(80, Math.max(20, tip.x))}%` }}>
      <p className="font-heading text-xs font-bold">{tip.title}</p>
      {tip.lines.map((l) => (
        <p key={l} className="font-body text-xs">
          {l}
        </p>
      ))}
    </div>
  );
}

/** El botón que alterna entre el gráfico y su tabla. */
export function ViewToggle({ table, onChange }: { table: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!table)} aria-pressed={table} className="min-h-11 cursor-pointer px-1 font-body text-xs text-text-secondary underline">
      {table ? "Ver gráfico" : "Ver como tabla"}
    </button>
  );
}

function DataTable({ caption, head, rows }: { caption: string; head: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[280px] border-collapse text-left font-body text-xs">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {head.map((h) => (
              <th key={h} scope="col" className="border-b border-brand-200 py-2 pr-3 font-heading font-bold text-text-primary">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r[0]}>
              {r.map((c, i) => (
                <td key={i} className="border-b border-brand-200 py-2 pr-3 text-text-secondary tabular-nums">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Columnas: lo recaudado sobre lo esperado, mes a mes ──────────────────────────────────────────────────────────

export type CollectionPoint = { month: string; expected: number; collected: number; percent: number | null };

export function CollectionChart({ data, selected }: { data: CollectionPoint[]; selected: string }) {
  const [table, setTable] = useState(false);
  const [active, setActive] = useState<number | null>(null);
  const W = 360;
  const H = 190;
  const pad = { l: 40, r: 8, t: 22, b: 26 };
  const innerW = W - pad.l - pad.r;
  const innerH = H - pad.t - pad.b;
  const max = niceMax(Math.max(...data.map((d) => d.expected), 0));
  const slot = innerW / data.length;
  const bar = Math.min(24, slot * 0.55);
  const y = (v: number) => pad.t + innerH - (v / max) * innerH;
  const ticks = [0, max / 2, max];

  if (table) {
    return (
      <>
        <DataTable caption="Cobro por mes" head={["Mes", "Esperado", "Recaudado", "%"]} rows={data.map((d) => [d.month, formatSolesAmount(d.expected), formatSolesAmount(d.collected), d.percent === null ? "sin datos" : `${d.percent}%`])} />
        <ViewToggle table onChange={setTable} />
      </>
    );
  }

  const tip: Tip =
    active === null
      ? null
      : { x: ((pad.l + slot * (active + 0.5)) / W) * 100, title: monthLabel(data[active].month), lines: data[active].percent === null ? ["Sin cuotas ese mes"] : [`Esperado ${formatSolesAmount(data[active].expected)}`, `Recaudado ${formatSolesAmount(data[active].collected)} (${data[active].percent}%)`] };

  return (
    <>
      <div className="mb-2 flex items-center gap-4 font-body text-xs text-text-secondary" aria-hidden="true">
        <span className="flex items-center gap-1.5">
          <i className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: SERIES }} /> Recaudado
        </span>
        <span className="flex items-center gap-1.5">
          <i className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: TRACK }} /> Esperado
        </span>
      </div>
      <div className="relative" onMouseLeave={() => setActive(null)}>
        <Tooltip tip={tip} />
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="group" aria-label="Cobro de los últimos 6 meses: recaudado sobre esperado">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke={GRID} strokeWidth="1" />
              <text x={pad.l - 6} y={y(t) + 4} textAnchor="end" className="fill-text-secondary" fontSize="10">
                {t >= 1000 ? `${t / 1000}K` : t}
              </text>
            </g>
          ))}
          {data.map((d, i) => {
            const cx = pad.l + slot * (i + 0.5);
            const x = cx - bar / 2;
            const hasData = d.percent !== null;
            const trackH = hasData ? Math.max(4, (d.expected / max) * innerH) : 0;
            const fillH = hasData ? Math.min(trackH, (d.collected / max) * innerH) : 0;
            return (
              <g key={d.month} tabIndex={0} role="img" aria-label={`${d.month}: ${hasData ? `${formatSolesAmount(d.collected)} recaudado de ${formatSolesAmount(d.expected)}, ${d.percent}%` : "sin cuotas"}`} onMouseEnter={() => setActive(i)} onFocus={() => setActive(i)} onBlur={() => setActive(null)} onClick={() => setActive(i)} className="cursor-pointer outline-none focus-visible:[&_rect.hit]:stroke-[#1B1B1B]">
                <rect className="hit" x={cx - slot / 2} y={pad.t} width={slot} height={innerH + pad.b} fill="transparent" strokeWidth="2" />
                {hasData && <path d={roundedTop(x, y(0) - trackH, bar, trackH, 4)} fill={TRACK} />}
                {hasData && fillH > 0 && <path d={roundedTop(x, y(0) - fillH, bar, fillH, Math.min(4, fillH))} fill={SERIES} stroke={SURFACE} strokeWidth="0" />}
                {hasData && d.month === selected && (
                  <text x={cx} y={y(0) - trackH - 6} textAnchor="middle" className="fill-text-primary" fontSize="10" fontWeight="700">
                    {d.percent}%
                  </text>
                )}
                <text x={cx} y={H - 8} textAnchor="middle" className={d.month === selected ? "fill-text-primary" : "fill-text-secondary"} fontSize="10" fontWeight={d.month === selected ? 700 : 400}>
                  {monthShort(d.month)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <ViewToggle table={false} onChange={setTable} />
    </>
  );
}

/** Una columna con la punta de arriba redondeada y la base recta, anclada a la línea de base. */
function roundedTop(x: number, y: number, w: number, h: number, r: number): string {
  const rr = Math.min(r, w / 2, h);
  return `M${x},${y + h} V${y + rr} Q${x},${y} ${x + rr},${y} H${x + w - rr} Q${x + w},${y} ${x + w},${y + rr} V${y + h} Z`;
}

// ── Línea: la asistencia semana a semana ─────────────────────────────────────────────────────────────────────────

export type TrendPoint = { weekStart: string; percent: number | null; sessions: number };

const shortDate = (date: string) => `${Number(date.slice(8))} ${monthShort(date.slice(0, 7))}`;

export function TrendChart({ data }: { data: TrendPoint[] }) {
  const [table, setTable] = useState(false);
  const [active, setActive] = useState<number | null>(null);
  const W = 360;
  const H = 170;
  const pad = { l: 32, r: 18, t: 26, b: 26 };
  const innerW = W - pad.l - pad.r;
  const innerH = H - pad.t - pad.b;
  const x = (i: number) => pad.l + (data.length === 1 ? innerW / 2 : (i * innerW) / (data.length - 1));
  const y = (v: number) => pad.t + innerH - (v / 100) * innerH;

  if (table) {
    return (
      <>
        <DataTable caption="Asistencia por semana" head={["Semana del", "Asistencia", "Entrenamientos"]} rows={data.map((d) => [shortDate(d.weekStart), d.percent === null ? "sin datos" : `${d.percent}%`, String(d.sessions)])} />
        <ViewToggle table onChange={setTable} />
      </>
    );
  }

  // La línea se corta donde no hubo entrenamientos: un hueco no es un 0.
  const segments: string[] = [];
  let current = "";
  data.forEach((d, i) => {
    if (d.percent === null) {
      if (current) segments.push(current);
      current = "";
    } else {
      current += `${current ? "L" : "M"}${x(i).toFixed(1)},${y(d.percent).toFixed(1)}`;
    }
  });
  if (current) segments.push(current);
  const lastIdx = data.map((d) => d.percent).findLastIndex((p) => p !== null);

  const tip: Tip =
    active === null
      ? null
      : { x: (x(active) / W) * 100, title: `Semana del ${shortDate(data[active].weekStart)}`, lines: data[active].percent === null ? ["Sin entrenamientos con asistencia"] : [`Asistencia ${data[active].percent}%`, `${data[active].sessions} ${data[active].sessions === 1 ? "entrenamiento" : "entrenamientos"}`] };

  return (
    <>
      <div className="relative" onMouseLeave={() => setActive(null)}>
        <Tooltip tip={tip} />
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="group" aria-label="Asistencia por semana, últimas 12 semanas">
          {[0, 50, 100].map((t) => (
            <g key={t}>
              <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke={GRID} strokeWidth="1" />
              <text x={pad.l - 6} y={y(t) + 4} textAnchor="end" className="fill-text-secondary" fontSize="10">
                {t}%
              </text>
            </g>
          ))}
          {segments.map((d) => (
            <path key={d} d={d} fill="none" stroke={SERIES} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          ))}
          {data.map((d, i) => (
            <g key={d.weekStart} tabIndex={0} role="img" aria-label={`Semana del ${shortDate(d.weekStart)}: ${d.percent === null ? "sin datos" : `${d.percent}%`}`} onMouseEnter={() => setActive(i)} onFocus={() => setActive(i)} onBlur={() => setActive(null)} onClick={() => setActive(i)} className="cursor-pointer outline-none focus-visible:[&_rect.hit]:stroke-[#1B1B1B]">
              <rect className="hit" x={x(i) - innerW / data.length / 2} y={pad.t} width={innerW / data.length} height={innerH + pad.b} fill="transparent" strokeWidth="2" />
              {d.percent !== null && <circle cx={x(i)} cy={y(d.percent)} r={i === lastIdx || active === i ? 5 : 4} fill={SERIES} stroke={SURFACE} strokeWidth="2" />}
              {d.percent !== null && i === lastIdx && (
                <text x={x(i)} y={y(d.percent) - 10} textAnchor="middle" className="fill-text-primary" fontSize="10" fontWeight="700">
                  {d.percent}%
                </text>
              )}
              {i % 3 === 0 && (
                <text x={x(i)} y={H - 8} textAnchor="middle" className="fill-text-secondary" fontSize="10">
                  {shortDate(d.weekStart)}
                </text>
              )}
            </g>
          ))}
        </svg>
      </div>
      <ViewToggle table={false} onChange={setTable} />
    </>
  );
}

// ── Barras horizontales: una comparación por nombre ──────────────────────────────────────────────────────────────

/** Barras finas con el valor en la punta, para comparar categorías o jugadores por porcentaje. */
export function PercentBars({ rows, caption }: { rows: { key: string; label: string; sub?: string; percent: number | null; detail?: string }[]; caption: string }) {
  return (
    <ul aria-label={caption} className="flex flex-col">
      {rows.map((r) => (
        <li key={r.key} className="border-b border-brand-200 py-3 last:border-0">
          <div className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 truncate font-heading text-sm font-bold text-text-primary">{r.label}</span>
            <span className="shrink-0 font-heading text-sm font-bold text-text-primary tabular-nums">{r.percent === null ? "Sin datos" : `${r.percent}%`}</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full" style={{ background: TRACK }} role="progressbar" aria-valuenow={r.percent ?? 0} aria-valuemin={0} aria-valuemax={100} aria-label={`${r.label}: ${r.percent === null ? "sin datos" : `${r.percent}%`}`}>
            <div className="h-full rounded-full" style={{ width: `${r.percent ?? 0}%`, background: SERIES }} />
          </div>
          {(r.sub || r.detail) && <p className="mt-1 font-body text-xs text-text-secondary">{[r.sub, r.detail].filter(Boolean).join(" · ")}</p>}
        </li>
      ))}
    </ul>
  );
}
