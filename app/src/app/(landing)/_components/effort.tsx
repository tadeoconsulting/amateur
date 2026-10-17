import { ScrollReveal } from "./scroll-reveal";

/** El bloque emocional de la propuesta: lo que el jugador gana al quedar registrado. */
export function Effort() {
  return (
    <section className="px-4 py-20 sm:px-6 sm:py-28">
      <ScrollReveal className="mx-auto max-w-7xl">
        <p className="mb-8 text-xs font-bold uppercase tracking-[0.16em]">03 / Tu esfuerzo cuenta</p>
        <h2 className="lc-display text-[clamp(4rem,15vw,10.5rem)]">
          No es solo
          <br />
          un <span className="text-[var(--lc-lime)]">partido.</span>
        </h2>

        <div className="mt-10 grid items-center gap-8 md:grid-cols-[1fr_1fr]">
          <svg viewBox="0 0 48 48" className="h-12 w-12 text-[var(--lc-lime)]" fill="none" stroke="currentColor" strokeWidth="5" aria-hidden="true">
            <circle cx="24" cy="24" r="20" />
            <circle cx="24" cy="24" r="9" />
          </svg>
          <p className="max-w-md text-lg leading-relaxed text-[var(--lc-muted)]">
            Es tu equipo, tus goles, tu historia.
            <br />
            Tu esfuerzo ya no queda invisible.
          </p>
        </div>
      </ScrollReveal>
    </section>
  );
}
