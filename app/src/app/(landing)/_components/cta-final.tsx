import { ScrollReveal } from "./scroll-reveal";

/** La tarjeta lima del cierre: un solo llamado, con el asterisco de la cinta como marca de agua. */
export function CtaFinal({ onOpenAuth }: { onOpenAuth: (view: "login" | "register") => void }) {
  return (
    <section className="px-4 pb-16 sm:px-6 sm:pb-24">
      <ScrollReveal className="relative mx-auto max-w-7xl overflow-hidden rounded-[28px] bg-[var(--lc-lime)] px-6 py-14 text-[var(--lc-ink)] sm:px-14 sm:py-20">
        <svg
          viewBox="0 0 100 100"
          className="pointer-events-none absolute -bottom-10 -right-10 h-64 w-64 text-[var(--lc-ink)]/10 sm:-bottom-16 sm:right-8 sm:h-96 sm:w-96"
          stroke="currentColor"
          strokeWidth="6"
          aria-hidden="true"
        >
          <path d="M50 2v96M2 50h96M16 16l68 68M84 16L16 84" />
        </svg>

        <div className="relative">
          <p className="mb-8 text-xs font-bold uppercase tracking-[0.16em]">El próximo paso lo das tú</p>
          <h2 className="lc-display text-[clamp(3rem,9vw,6.5rem)]">
            Deja de administrar
            <br />
            en WhatsApp.
          </h2>
          <p className="mt-6 max-w-md text-lg leading-relaxed opacity-80">
            Crea tu primer torneo en minutos.
            <br />
            Gratis, sin tarjeta de crédito, sin complicaciones.
          </p>
          <button onClick={() => onOpenAuth("register")} className="lc-btn mt-9 bg-[var(--lc-ink)] text-[var(--lc-white)] hover:bg-black">
            Empezar ahora <span aria-hidden="true">↗</span>
          </button>
        </div>
      </ScrollReveal>
    </section>
  );
}
