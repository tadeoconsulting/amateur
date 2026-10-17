import { ScrollReveal } from "./scroll-reveal";

const STEPS = [
  { number: "01", title: "Crea tu torneo", description: "Configura formato, sedes, condiciones y bases. El fixture se genera automáticamente." },
  { number: "02", title: "Gestiona en vivo", description: "Registra goles, tarjetas y sanciones desde el celular. La tabla se actualiza al instante." },
  { number: "03", title: "Todo queda registrado", description: "Jugadores, clubes y fans ven el historial completo: goles, estadísticas y trayectoria." },
];

/** La sección clara del lineamiento (como en la referencia): corta el fondo oscuro. */
export function HowItWorks() {
  return (
    <section id="como-funciona" className="scroll-mt-16 bg-[var(--lc-paper)] px-4 py-20 text-[var(--lc-ink)] sm:px-6 sm:py-28">
      <div className="mx-auto max-w-7xl">
        <ScrollReveal className="mb-12 max-w-2xl">
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.16em]">Cómo funciona</p>
          <h2 className="lc-display text-5xl sm:text-7xl">
            De la cancha
            <br />a la pantalla.
          </h2>
          <p className="mt-5 opacity-70">Tres pasos. Todo tu torneo conectado.</p>
        </ScrollReveal>

        <div className="grid gap-4 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <ScrollReveal key={s.number} delay={i * 100}>
              <div className="h-full rounded-[var(--lc-radius)] border border-[var(--lc-ink)]/15 bg-white/50 p-7">
                <span className="lc-display text-6xl text-[var(--lc-ink)]/30">{s.number}</span>
                <h3 className="lc-display mt-4 text-4xl !leading-[1]">{s.title}</h3>
                <p className="mt-3 opacity-75">{s.description}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
