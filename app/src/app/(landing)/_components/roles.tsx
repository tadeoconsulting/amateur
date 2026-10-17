"use client";

import { useEffect, useRef, useState } from "react";
import { ScrollReveal } from "./scroll-reveal";

const ROTATE_MS = 10_000;

const ROLES = [
  {
    tab: "Organizador",
    eyebrow: "Tu torneo se administra solo.",
    title: ["Un torneo.", "Cero planillas."],
    description:
      "Arma el fixture, registra los goles desde el celular y deja que la tabla se actualice sola. Sin planillas, sin WhatsApp.",
    items: ["Fixture automático", "Tabla de posiciones en tiempo real", "Control de sanciones", "Temporadas con fase final"],
  },
  {
    tab: "Club",
    eyebrow: "Tu equipo, tu identidad.",
    title: ["Un club.", "Toda su historia."],
    description:
      "Gestiona tu plantilla, controla convocatorias y lleva el historial del club a través de todos los torneos. Tu equipo ya no depende del organizador.",
    items: ["Gestión de plantilla", "Control de convocatorias", "Historial del club", "Trayectoria entre torneos"],
  },
  {
    tab: "Jugador",
    eyebrow: "Tu perfil te pertenece.",
    title: ["Un jugador.", "Toda su carrera."],
    description: "Goles, tarjetas y trayectoria en un perfil portátil que viaja contigo entre clubes y torneos.",
    items: ["Goles y tarjetas", "Perfil portátil", "Historial por torneo", "Trayectoria entre clubes"],
  },
  {
    tab: "Fan",
    eyebrow: "Sigue cada jugada.",
    title: ["Una hinchada.", "Cada jugada."],
    description:
      "Resultados en tiempo real, tabla de posiciones y goleadores de tus equipos favoritos. Sin depender del grupo de WhatsApp.",
    items: ["Resultados en vivo", "Tabla de posiciones", "Goleadores del torneo", "Fixture y próximos partidos"],
  },
];

/**
 * La plataforma por rol, en pestañas. Rota sola cada 10 segundos; cualquier interacción (elegir una pestaña, pasar el
 * mouse o enfocar la sección) reinicia o detiene el conteo. Sin movimiento si la persona pidió reducirlo.
 */
export function Roles() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  // Cambia con cada elección manual para que el conteo de 10 s arranque de nuevo.
  const [resetKey, setResetKey] = useState(0);

  useEffect(() => {
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setTimeout(() => setActive((i) => (i + 1) % ROLES.length), ROTATE_MS);
    return () => clearTimeout(timer);
  }, [active, paused, resetKey]);

  const role = ROLES[active];

  // En el celular las pestañas son un carrusel: la activa se centra sola (sin mover la página hacia arriba o abajo).
  const tabsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const list = tabsRef.current;
    const tab = list?.children[active] as HTMLElement | undefined;
    if (!list || !tab) return;
    list.scrollTo({ left: tab.offsetLeft - (list.clientWidth - tab.clientWidth) / 2, behavior: "smooth" });
  }, [active]);

  function choose(i: number) {
    setActive(i);
    setResetKey((k) => k + 1);
  }

  return (
    <section
      id="plataforma" 
      className="scroll-mt-16 px-4 py-20 sm:px-6 sm:py-28"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="mx-auto max-w-7xl">
        <ScrollReveal className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="lc-eyebrow mb-4 !text-[var(--lc-white)]">01 / La plataforma</p>
            <h2 className="lc-display text-[clamp(3rem,8vw,6rem)]">
              El mismo fútbol.
              <br />
              <span className="bg-gradient-to-b from-[var(--lc-muted)] to-[#7d877f] bg-clip-text text-transparent">Otra forma de vivirlo.</span>
            </h2>
          </div>
          <p className="max-w-[16rem] text-[var(--lc-muted)]">Dentro y fuera de la cancha, cada uno tiene su lugar.</p>
        </ScrollReveal>

        <div
          ref={tabsRef}
          role="tablist"
          aria-label="La plataforma por rol"
          className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-4 lg:overflow-visible lg:px-0"
        >
          {ROLES.map((r, i) => (
            <button
              key={r.tab}
              id={`rol-tab-${i}`}
              role="tab"
              type="button"
              aria-selected={i === active}
              aria-controls="rol-panel"
              tabIndex={i === active ? 0 : -1}
              onClick={() => choose(i)}
              onKeyDown={(e) => {
                if (e.key === "ArrowRight") choose((i + 1) % ROLES.length);
                if (e.key === "ArrowLeft") choose((i - 1 + ROLES.length) % ROLES.length);
              }}
              className={`flex shrink-0 snap-center cursor-pointer items-center justify-between gap-4 rounded-xl border px-4 py-4 text-left text-base transition-colors sm:min-w-[10.5rem] sm:px-5 sm:py-6 lg:min-w-0 ${
                i === active
                  ? "border-[var(--lc-lime)] bg-[var(--lc-lime)] font-semibold text-[var(--lc-ink)]"
                  : "border-[var(--lc-line)] hover:border-[var(--lc-lime)]"
              }`}
            >
              {r.tab}
              <span aria-hidden="true" className="hidden sm:inline">↗</span>
            </button>
          ))}
        </div>

        <div
          id="rol-panel"
          role="tabpanel"
          aria-labelledby={`rol-tab-${active}`}
          key={active}
          className="mt-10 grid gap-10 px-1 lg:grid-cols-2 lg:gap-16 lg:px-6"
        >
          <div>
            <p className="lc-eyebrow mb-6 !text-[11px]">{role.eyebrow}</p>
            <h3 className="text-4xl font-bold leading-[1.1] sm:text-5xl">
              {role.title[0]}
              <br />
              {role.title[1]}
            </h3>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-[var(--lc-muted)]">{role.description}</p>
            <a href="#como-funciona" className="mt-8 inline-flex items-center gap-3 font-bold">
              Conoce cómo funciona <span aria-hidden="true">↗</span>
            </a>
          </div>

          <ul>
            {role.items.map((item, i) => (
              <li key={item} className="flex items-center gap-4 border-b border-[var(--lc-line)] py-5 first:pt-2">
                <span className="w-6 text-xs text-[var(--lc-muted)]">{String(i + 1).padStart(2, "0")}</span>
                <span className="flex-1 text-lg">{item}</span>
                <span aria-hidden="true" className="text-[var(--lc-lime)]">✓</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
