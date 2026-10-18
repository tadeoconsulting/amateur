"use client";

import Link from "next/link";
import { getTournaments, modalityLabel } from "@/_lib/api";
import { useApi } from "@/_lib/use-api";
import { formatLabel } from "@/_lib/tournament-labels";
import { ScrollReveal } from "./scroll-reveal";
import { tournamentPublicPath } from "@/_lib/slug";

function statusBadge(status: string): { text: string; live: boolean } | null {
  switch (status) {
    case "en_curso":
      return { text: "En vivo", live: true };
    case "inscripcion":
      return { text: "Inscripción abierta", live: false };
    case "finalizado":
      return { text: "Finalizado", live: false };
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
 * Se piden los torneos públicos sin importar su estado (incluye finalizados), ordenados por
 * fecha de inicio más reciente primero: así un torneo en curso o por empezar queda arriba, y uno
 * recién finalizado sigue siendo relevante en vez de desaparecer de golpe.
 */
export function PublicTournaments() {
  // La portada la ve cualquiera: su lista puede guardarse unos segundos en la caché de borde (OBS-58).
  const { data: tournaments, loading } = useApi(() => getTournaments(undefined, { pub: true }));

  // Sin spinner ni estado de error visibles: es una sección de "prueba social" en una landing,
  // no una pantalla funcional — si todavía no carga, o no hay nada que mostrar, se omite entera.
  if (loading || !tournaments) return null;

  const publicTournaments = [...tournaments]
    .filter((t) => t.status !== "draft")
    .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
    .slice(0, 6);

  if (publicTournaments.length === 0) return null;

  return (
    <section id="torneos" className="scroll-mt-16 px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-7xl">
        <ScrollReveal className="mb-12 max-w-2xl">
          <p className="lc-eyebrow mb-4">En la cancha ahora</p>
          <h2 className="lc-display text-5xl sm:text-7xl">Torneos en Amateur</h2>
          <p className="mt-5 text-[var(--lc-muted)]">
            Fixture, tabla de posiciones y resultados en vivo, sin necesidad de crear una cuenta.
          </p>
        </ScrollReveal>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {publicTournaments.map((t, i) => {
            const badge = statusBadge(t.status);
            const format = [formatLabel(t.format), modalityLabel(t.modality)].filter(Boolean).join(" · ");

            return (
              <ScrollReveal key={t.id} delay={i * 80}>
                <Link
                  href={tournamentPublicPath({ id: t.id, slug: t.slug, organizerSlug: t.organizer.organizerSlug })}
                  className="lc-card group flex h-full flex-col p-6 transition-colors hover:border-[var(--lc-lime)]"
                >
                  <div className="mb-5 flex items-start justify-between gap-3">
                    <h3 className="lc-display text-3xl !leading-[1]">{t.name}</h3>
                    {badge && (
                      <span
                        className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold ${
                          badge.live ? "bg-[var(--lc-lime)] text-[var(--lc-ink)]" : "border border-[var(--lc-line)] text-[var(--lc-muted)]"
                        }`}
                      >
                        {badge.live && <span className="lc-live-dot !bg-[var(--lc-ink)]" aria-hidden="true" />}
                        {badge.text}
                      </span>
                    )}
                  </div>

                  <dl className="flex flex-1 flex-col gap-1.5 text-sm text-[var(--lc-muted)]">
                    <div>
                      <dt className="sr-only">Fecha</dt>
                      <dd>{formatDate(t.startDate)}</dd>
                    </div>
                    <div>
                      <dt className="sr-only">Sede</dt>
                      <dd className="truncate">{t.location}</dd>
                    </div>
                    <div>
                      <dt className="sr-only">Formato y equipos</dt>
                      <dd>
                        {format} · {t.teamsCount} equipos
                      </dd>
                    </div>
                  </dl>

                  <span className="mt-6 inline-flex items-center gap-1 text-sm font-bold text-[var(--lc-lime)]">
                    Ver torneo <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">↗</span>
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
