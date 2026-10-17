"use client";

export function Hero({ onOpenAuth }: { onOpenAuth: (view: "login" | "register") => void }) {
  return (
    <section className="relative overflow-hidden px-4 pb-16 pt-28 sm:px-6 lg:pt-36">
      <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="lc-eyebrow mb-6 flex items-center gap-2">
            <span className="lc-live-dot" aria-hidden="true" />
            El fútbol es tuyo
          </p>
          <h1 className="lc-display text-[clamp(3.25rem,11.5vw,7.5rem)]">
            Tu torneo.
            <br />
            Tu <span className="text-transparent [-webkit-text-stroke:2px_var(--lc-lime)]">comunidad</span>
            <span className="text-[var(--lc-lime)]">.</span>
          </h1>
          <p className="mt-8 max-w-md text-lg leading-relaxed text-[var(--lc-muted)]">
            Crea torneos, gestiona equipos y da seguimiento a cada gol, tarjeta y minuto jugado.{" "}
            <strong className="font-semibold text-[var(--lc-white)]">Todo en un solo lugar.</strong>
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <button onClick={() => onOpenAuth("register")} className="lc-btn lc-btn-lime">
              Crear mi torneo gratis <span aria-hidden="true">↗</span>
            </button>
            <a href="#como-funciona" className="lc-btn lc-btn-ghost">
              Así funciona <span aria-hidden="true">↓</span>
            </a>
          </div>
          <p className="mt-4 text-sm text-[var(--lc-muted)]">Sin tarjeta de crédito. Sin complicaciones.</p>
        </div>

        <MatchCenterExample />
      </div>
    </section>
  );
}

/**
 * La tarjeta "Match Center" del hero. Por ahora es un ejemplo (datos inventados, marcado como tal): la entrega 2 de la
 * especificación 013 la reemplaza por el partido real en vivo cuando hay uno.
 */
function MatchCenterExample() {
  return (
    <div className="mx-auto w-full max-w-md lg:max-w-none">
      <div className="lc-card p-5 sm:p-6">
        <div className="mb-5 flex items-center justify-between text-xs font-bold uppercase tracking-widest text-[var(--lc-muted)]">
          <span>Amateur / Match Center</span>
          <span className="flex items-center gap-2 text-[var(--lc-lime)]">
            <span className="lc-live-dot" aria-hidden="true" />
            En vivo
          </span>
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-center">
          <Team initial="B" name="Barrio FC" />
          <div>
            <p className="lc-display text-6xl sm:text-7xl">
              2<span className="text-[var(--lc-lime)]">:</span>1
            </p>
            <p className="mt-1 text-[11px] font-bold uppercase tracking-widest text-[var(--lc-muted)]">68′ · 2.º tiempo</p>
          </div>
          <Team initial="D" name="Deportivo Sur" />
        </div>

        <p className="mt-5 flex items-center justify-between rounded-xl border border-[var(--lc-line)] px-4 py-3 text-sm">
          <span>⚽ Gol · Barrio FC</span>
          <span className="font-bold text-[var(--lc-lime)]">68′</span>
        </p>
      </div>
      <p className="mt-3 text-center text-[11px] font-bold uppercase tracking-widest text-[var(--lc-muted)]">
        Vista ilustrativa · datos de ejemplo
      </p>
    </div>
  );
}

function Team({ initial, name }: { initial: string; name: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="lc-display flex h-14 w-14 items-center justify-center rounded-full border border-[var(--lc-line)] bg-[var(--lc-bg)] text-3xl">
        {initial}
      </span>
      <span className="text-sm font-semibold">{name}</span>
    </div>
  );
}
