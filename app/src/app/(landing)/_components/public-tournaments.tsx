"use client";

import Link from "next/link";
import { getTournaments, modalityLabel } from "@/_lib/api";
import { useApi } from "@/_lib/use-api";
import { formatLabel } from "@/_lib/tournament-labels";
import { ScrollReveal } from "./scroll-reveal";
import { tournamentPublicPath } from "@/_lib/slug";

function statusBadge(status: string): { text: string; color: string } | null {
  switch (status) {
    case "en_curso":
      return { text: "En vivo", color: "bg-field-green text-white" };
    case "inscripcion":
      return { text: "Inscripción abierta", color: "bg-yellow text-text-primary" };
    case "finalizado":
      return { text: "Finalizado", color: "bg-brand-300 text-text-primary" };
    default:
      return null;
  }
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("es-PE", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

/**
 * Vitrina pública de torneos reales en la landing, para que alguien sin cuenta pueda entrar
 * directo a seguir uno (fixture, tabla, resultados) desde su URL pública (/{organizador}/{torneo}), la
 * única pantalla de torneo que no exige sesión.
 *
 * Se pidieron los torneos públicos sin importar su estado (incluye finalizados), ordenados por
 * fecha de inicio más reciente primero: así un torneo en curso o por empezar queda arriba, y uno
 * recién finalizado sigue siendo relevante en vez de desaparecer de golpe.
 */
export function PublicTournaments() {
  const { data: tournaments, loading } = useApi(() => getTournaments());

  // Sin spinner ni estado de error visibles: es una sección de "prueba social" en una landing,
  // no una pantalla funcional — si todavía no carga, o no hay nada que mostrar, se omite entera.
  if (loading || !tournaments) return null;

  const publicTournaments = [...tournaments]
    .filter((t) => t.status !== "draft")
    .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
    .slice(0, 6);

  if (publicTournaments.length === 0) return null;

  return (
    <section id="torneos" className="py-20 sm:py-28 px-4 sm:px-6 bg-surface-primary">
      <div className="max-w-6xl mx-auto">
        <ScrollReveal className="text-center mb-16">
          <p className="text-sm font-bold text-field-green uppercase tracking-widest mb-3 font-heading">
            En la cancha ahora
          </p>
          <h2 className="font-heading text-3xl sm:text-5xl font-bold text-text-primary leading-tight">
            Torneos en Amateur
          </h2>
          <p className="mt-4 text-text-secondary font-body max-w-xl mx-auto">
            Fixture, tabla de posiciones y resultados en vivo — sin necesidad de crear una cuenta.
          </p>
        </ScrollReveal>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {publicTournaments.map((t, i) => {
            const badge = statusBadge(t.status);
            const format = [formatLabel(t.format), modalityLabel(t.modality)].filter(Boolean).join(" · ");

            return (
              <ScrollReveal key={t.id} delay={i * 80}>
                <Link
                  href={tournamentPublicPath({ id: t.id, slug: t.slug, organizerSlug: t.organizer.organizerSlug })}
                  className="group flex h-full flex-col rounded-2xl border border-brand-200 bg-surface-alt p-6 transition-all hover:border-field-green hover:shadow-lg"
                >
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <h3 className="font-heading text-lg font-bold leading-snug text-text-primary transition-colors group-hover:text-field-dark">
                      {t.name}
                    </h3>
                    {badge && (
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold whitespace-nowrap ${badge.color}`}>
                        {badge.text}
                      </span>
                    )}
                  </div>

                  <dl className="flex flex-1 flex-col gap-2 font-body text-sm text-text-secondary">
                    <div className="flex items-center gap-2">
                      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" className="shrink-0" aria-hidden="true">
                        <rect x="2" y="3" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
                        <path d="M2 6.5h12M5 1.5v3M11 1.5v3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                      </svg>
                      <dt className="sr-only">Fecha</dt>
                      <dd>{formatDate(t.startDate)}</dd>
                    </div>
                    <div className="flex items-center gap-2">
                      <svg width="15" height="15" viewBox="0 0 14 14" fill="none" className="shrink-0" aria-hidden="true">
                        <path d="M7 1.75a4.375 4.375 0 00-4.375 4.375C2.625 9.5 7 12.25 7 12.25s4.375-2.75 4.375-6.125A4.375 4.375 0 007 1.75z" stroke="currentColor" strokeWidth="1.1" />
                        <circle cx="7" cy="6.125" r="1.5" stroke="currentColor" strokeWidth="1.1" />
                      </svg>
                      <dt className="sr-only">Sede</dt>
                      <dd className="truncate">{t.location}</dd>
                    </div>
                    <div className="flex items-center gap-2">
                      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" className="shrink-0" aria-hidden="true">
                        <path d="M8 1.5l1.545 3.33 3.664.485-2.68 2.55.68 3.635L8 9.75l-3.21 1.75.68-3.635-2.68-2.55 3.664-.485L8 1.5z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
                      </svg>
                      <dt className="sr-only">Formato y equipos</dt>
                      <dd>{format} · {t.teamsCount} equipos</dd>
                    </div>
                  </dl>

                  <span className="mt-5 inline-flex items-center gap-1 font-heading text-sm font-bold text-field-dark">
                    Ver torneo
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="transition-transform group-hover:translate-x-0.5" aria-hidden="true">
                      <path d="M3 7h8M7.5 3.5L11 7l-3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </Link>
              </ScrollReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
