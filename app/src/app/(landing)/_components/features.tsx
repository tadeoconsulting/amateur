import { ScrollReveal } from "./scroll-reveal";

const features = [
  {
    role: "Organizador",
    title: "Tu torneo se administra solo",
    description:
      "Fixture automático, tabla de posiciones en tiempo real, gestión de sanciones y validación de alineaciones. Sin planillas, sin WhatsApp.",
    icon: (
      <svg viewBox="0 0 48 48" fill="none" className="w-12 h-12" aria-hidden="true">
        <rect x="6" y="6" width="36" height="36" rx="8" stroke="currentColor" strokeWidth="2.5" />
        <path d="M6 18h36" stroke="currentColor" strokeWidth="2" opacity="0.4" />
        <path d="M18 18v24" stroke="currentColor" strokeWidth="2" opacity="0.4" />
        <circle cx="30" cy="30" r="6" stroke="currentColor" strokeWidth="2" />
        <path d="M34.5 34.5L38 38" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    role: "Club",
    title: "Tu equipo, tu identidad",
    description:
      "Gestiona tu plantilla, controla convocatorias y lleva el historial del club a través de todos los torneos. Tu equipo ya no depende del organizador.",
    icon: (
      <svg viewBox="0 0 48 48" fill="none" className="w-12 h-12" aria-hidden="true">
        <path d="M24 8L8 18v12l16 10 16-10V18L24 8z" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M24 28V40" stroke="currentColor" strokeWidth="2" opacity="0.4" />
        <path d="M8 18l16 10 16-10" stroke="currentColor" strokeWidth="2" opacity="0.4" />
      </svg>
    ),
  },
  {
    role: "Jugador",
    title: "Tu perfil te pertenece",
    description:
      "Goles, tarjetas, minutos jugados y evolución — todo en un perfil portátil que viaja contigo entre clubes y torneos.",
    icon: (
      <svg viewBox="0 0 48 48" fill="none" className="w-12 h-12" aria-hidden="true">
        <circle cx="24" cy="16" r="8" stroke="currentColor" strokeWidth="2.5" />
        <path d="M12 40c0-6.627 5.373-12 12-12s12 5.373 12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M30 10l4-4M34 10l-4-4" stroke="currentColor" strokeWidth="2" opacity="0.4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    role: "Fan",
    title: "Sigue cada jugada",
    description:
      "Resultados en tiempo real, tabla de posiciones y estadísticas de tus equipos favoritos. Sin depender del grupo de WhatsApp.",
    icon: (
      <svg viewBox="0 0 48 48" fill="none" className="w-12 h-12" aria-hidden="true">
        <path d="M24 6l4 8 9 1.3-6.5 6.4 1.5 9L24 26l-8 4.7 1.5-9L11 15.3l9-1.3L24 6z" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M12 36l-4 6M36 36l4 6" stroke="currentColor" strokeWidth="2" opacity="0.4" strokeLinecap="round" />
      </svg>
    ),
  },
];

export function Features() {
  return (
    <section id="features" className="py-20 sm:py-28 px-4 sm:px-6 bg-surface-primary">
      <div className="max-w-6xl mx-auto">
        <ScrollReveal className="text-center mb-16">
          <p className="text-sm font-bold text-field-green uppercase tracking-widest mb-3 font-heading">
            Características
          </p>
          <h2 className="font-heading text-3xl sm:text-5xl font-bold text-text-primary leading-tight">
            Todo lo que necesitas
            <br className="hidden sm:block" />
            para tu torneo
          </h2>
        </ScrollReveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 lg:gap-8">
          {features.map((f, i) => (
            <ScrollReveal key={f.role} delay={i * 100}>
              <div className="group relative bg-surface-alt border-2 border-brand-200 rounded-2xl p-8 hover:border-field-green hover:shadow-[0_4px_0_0_var(--color-field-green)] transition-all duration-200 cursor-default h-full">
                <div className="flex items-start gap-5">
                  <div className="shrink-0 text-field-green">{f.icon}</div>
                  <div>
                    <span className="inline-block text-xs font-bold text-field-dark bg-field-light px-2.5 py-0.5 rounded-full mb-3 uppercase tracking-wider">
                      {f.role}
                    </span>
                    <h3 className="font-heading text-xl font-bold text-text-primary mb-2">
                      {f.title}
                    </h3>
                    <p className="text-sm text-text-secondary font-body leading-relaxed">
                      {f.description}
                    </p>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
