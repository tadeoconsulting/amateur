import { ScrollReveal } from "./scroll-reveal";

export function CtaFinal({ onOpenAuth }: { onOpenAuth: (view: "login" | "register") => void }) {
  return (
    <section className="bg-[var(--lc-lime)] px-4 py-20 text-[var(--lc-ink)] sm:px-6 sm:py-28">
      <ScrollReveal className="mx-auto max-w-4xl text-center">
        <p className="mb-4 text-xs font-bold uppercase tracking-[0.16em]">El próximo paso lo das tú</p>
        <h2 className="lc-display text-[clamp(3rem,11vw,7rem)]">
          Deja de administrar
          <br />
          en WhatsApp.
        </h2>
        <p className="mx-auto mt-6 max-w-lg text-lg opacity-75">
          Crea tu primer torneo en minutos. Gratis, sin tarjeta de crédito, sin complicaciones.
        </p>
        <button
          onClick={() => onOpenAuth("register")}
          className="lc-btn mt-10 bg-[var(--lc-ink)] text-[var(--lc-white)] hover:bg-black"
        >
          Empezar ahora <span aria-hidden="true">↗</span>
        </button>
      </ScrollReveal>
    </section>
  );
}
