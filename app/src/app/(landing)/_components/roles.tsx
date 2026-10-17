import { ScrollReveal } from "./scroll-reveal";

const ROLES = [
  {
    role: "Organizador",
    title: "Tu torneo se administra solo",
    description:
      "Fixture automático, tabla de posiciones en tiempo real, control de sanciones y temporadas con Apertura, Clausura y fase final. Sin planillas, sin WhatsApp.",
  },
  {
    role: "Club",
    title: "Tu equipo, tu identidad",
    description:
      "Gestiona tu plantilla y lleva el historial del club a través de todos los torneos. Tu equipo ya no depende del organizador.",
  },
  {
    role: "Jugador",
    title: "Tu perfil te pertenece",
    description:
      "Goles, tarjetas y trayectoria en un perfil portátil que viaja contigo entre clubes y torneos.",
  },
  {
    role: "Fan",
    title: "Sigue cada jugada",
    description:
      "Resultados en tiempo real, tabla de posiciones y estadísticas de tus equipos favoritos. Sin depender del grupo de WhatsApp.",
  },
];

export function Roles() {
  return (
    <section id="plataforma" className="px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-7xl">
        <ScrollReveal className="mb-12 max-w-2xl">
          <p className="lc-eyebrow mb-4">La plataforma</p>
          <h2 className="lc-display text-5xl sm:text-7xl">
            El mismo fútbol.
            <br />
            Otra forma de vivirlo.
          </h2>
          <p className="mt-5 text-[var(--lc-muted)]">Dentro y fuera de la cancha, cada uno tiene su lugar.</p>
        </ScrollReveal>

        <div className="grid gap-4 sm:grid-cols-2">
          {ROLES.map((r, i) => (
            <ScrollReveal key={r.role} delay={i * 80}>
              <div className="lc-card h-full p-7 sm:p-8">
                <span className="lc-eyebrow">{r.role}</span>
                <h3 className="lc-display mt-3 text-4xl !leading-[1]">{r.title}</h3>
                <p className="mt-4 text-[var(--lc-muted)]">{r.description}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
