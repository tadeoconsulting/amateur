import { ScrollReveal } from "./scroll-reveal";

/** El bloque emocional de la propuesta: lo que el jugador gana al quedar registrado. */
export function Effort() {
  return (
    <section className="px-4 py-24 sm:px-6 sm:py-32">
      <ScrollReveal className="mx-auto max-w-5xl text-center">
        <p className="lc-eyebrow mb-4">Tu esfuerzo cuenta</p>
        <h2 className="lc-display text-[clamp(3.5rem,12vw,8rem)]">
          No es solo
          <br />
          un partido<span className="text-[var(--lc-lime)]">.</span>
        </h2>
        <p className="mx-auto mt-8 max-w-xl text-lg text-[var(--lc-muted)]">
          Es tu equipo, tus goles, tu historia. Tu esfuerzo ya no queda invisible.
        </p>
      </ScrollReveal>
    </section>
  );
}
