import { ScrollReveal } from "./scroll-reveal";

const steps = [
  {
    number: "01",
    title: "Crea tu torneo",
    description: "Configura formato, sedes, condiciones y bases. El fixture se genera automáticamente.",
  },
  {
    number: "02",
    title: "Gestiona en vivo",
    description: "Registra resultados, tarjetas y sanciones desde el celular. La tabla se actualiza al instante.",
  },
  {
    number: "03",
    title: "Todo queda registrado",
    description: "Jugadores, clubes y fans ven el historial completo: goles, stats y trayectoria.",
  },
];

export function HowItWorks() {
  return (
    <section id="como-funciona" className="py-20 sm:py-28 px-4 sm:px-6 bg-surface-secondary text-text-invert relative overflow-hidden">
      {/* Decorative field center circle */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        <svg viewBox="0 0 400 400" className="w-[500px] h-[500px] text-field-green opacity-[0.06]" aria-hidden="true">
          <circle cx="200" cy="200" r="180" stroke="currentColor" strokeWidth="3" fill="none" />
          <circle cx="200" cy="200" r="6" fill="currentColor" />
          <line x1="200" y1="0" x2="200" y2="400" stroke="currentColor" strokeWidth="2" />
        </svg>
      </div>

      <div className="max-w-5xl mx-auto relative z-10">
        <ScrollReveal className="text-center mb-16">
          <p className="text-sm font-bold text-field-green uppercase tracking-widest mb-3 font-heading">
            Cómo funciona
          </p>
          <h2 className="font-heading text-3xl sm:text-5xl font-bold leading-tight">
            De la cancha a la pantalla
            <br className="hidden sm:block" />
            en 3 pasos
          </h2>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6">
          {steps.map((step, i) => (
            <ScrollReveal key={step.number} delay={i * 150}>
              <div className="relative">
                {/* Connector line (desktop only) */}
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-[calc(50%+40px)] w-[calc(100%-40px)] border-t-2 border-dashed border-field-green/30" />
                )}

                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full border-2 border-field-green text-field-green font-heading text-2xl font-bold mb-6">
                    {step.number}
                  </div>
                  <h3 className="font-heading text-xl font-bold mb-3">{step.title}</h3>
                  <p className="text-sm text-brand-500 font-body leading-relaxed max-w-xs mx-auto">
                    {step.description}
                  </p>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
