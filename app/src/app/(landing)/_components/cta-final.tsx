import { ScrollReveal } from "./scroll-reveal";
import { BallSvg } from "./field-svg";

export function CtaFinal({ onOpenAuth }: { onOpenAuth: (view: "login" | "register") => void }) {
  return (
    <section className="py-20 sm:py-28 px-4 sm:px-6 bg-surface-secondary text-text-invert relative overflow-hidden">
      {/* Decorative balls */}
      <div className="absolute top-8 left-[10%] motion-safe:animate-[float_5s_ease-in-out_infinite]">
        <BallSvg className="w-10 h-10 text-field-green opacity-20" />
      </div>
      <div className="absolute bottom-12 right-[12%] motion-safe:animate-[float_4s_ease-in-out_infinite_1.5s]">
        <BallSvg className="w-14 h-14 text-field-green opacity-15" />
      </div>

      {/* Field lines */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-full bg-brand-700/30" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full border border-brand-700/20" />
      </div>

      <div className="max-w-3xl mx-auto relative z-10 text-center">
        <ScrollReveal>
          <h2 className="font-heading text-4xl sm:text-6xl font-bold leading-tight mb-6">
            Deja de administrar
            <br />
            <span className="text-field-green">en WhatsApp</span>
          </h2>
          <p className="text-base sm:text-lg text-brand-500 font-body max-w-lg mx-auto mb-10">
            Crea tu primer torneo en minutos. Gratis, sin tarjeta de crédito, sin complicaciones.
          </p>
          <button
            onClick={() => onOpenAuth("register")}
            className="inline-flex text-base sm:text-lg font-bold bg-field-green text-surface-secondary px-10 py-4 rounded-full hover:bg-field-dark transition-colors cursor-pointer"
          >
            Empezar ahora
          </button>
        </ScrollReveal>
      </div>
    </section>
  );
}
