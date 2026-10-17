"use client";

export function Hero({ onOpenAuth }: { onOpenAuth: (view: "login" | "register") => void }) {
  return (
    <section className="relative overflow-hidden px-4 pb-16 pt-36 sm:px-6 sm:pt-28 lg:pt-36">
      <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="lc-eyebrow mb-6 flex items-center gap-2">
            <span className="lc-live-dot" aria-hidden="true" />
            El fútbol es tuyo
          </p>
          <h1 className="lc-display text-[clamp(3.25rem,11.5vw,6.5rem)] lg:text-[clamp(3.5rem,7.6vw,7.5rem)]">
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

        <ProductPreview />
      </div>
    </section>
  );
}

/**
 * La composición del hero: el Match Center y la tabla de posiciones, apilados e inclinados sobre un panel de cancha.
 * Por ahora son un ejemplo (datos inventados, marcado como tal): la entrega 2 de la especificación 013 muestra el
 * partido real en vivo cuando hay uno.
 */
function ProductPreview() {
  return (
    <div className="mx-auto w-full max-w-xl lg:max-w-none">
      <div className="relative rounded-[28px] border border-[var(--lc-line)] bg-gradient-to-br from-[#21402c] to-[#14241a] p-4 pb-6 sm:p-8 lg:-rotate-1">
        {/* Líneas de la cancha, de fondo */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-5 rounded-2xl border border-[var(--lc-lime)]/10">
          <div className="absolute inset-y-0 left-1/2 w-px bg-[var(--lc-lime)]/10" />
          <div className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--lc-lime)]/10" />
        </div>
        <span aria-hidden="true" className="absolute right-5 top-4 text-lg text-[var(--lc-lime)]/60">+</span>

        {/* Match Center */}
        <div className="relative rounded-2xl bg-[var(--lc-white)] p-5 text-[var(--lc-ink)] shadow-2xl sm:p-6 lg:rotate-[1deg]">
          <div className="mb-4 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest">
            <span>Amateur / Match Center</span>
            <span className="flex items-center gap-1.5 rounded-md bg-[var(--lc-lime)]/60 px-2 py-1">
              <span className="lc-live-dot !h-1.5 !w-1.5 !bg-[var(--lc-ink)]" aria-hidden="true" />
              En vivo
            </span>
          </div>

          <p className="text-xl font-bold leading-tight sm:text-2xl">
            El partido se juega.
            <br />
            La historia se queda.
          </p>

          <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-center">
            <Team initial="B" name="Barrio FC" dark />
            <div>
              <p className="lc-display text-5xl sm:text-6xl">
                2<span className="text-[var(--lc-ink)]/30"> : </span>1
              </p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-widest opacity-60">68′ · Segundo tiempo</p>
            </div>
            <Team initial="D" name="Deportivo Sur" />
          </div>

          <p className="mt-5 flex items-center justify-between border-t border-[var(--lc-ink)]/15 pt-3 text-sm">
            <span>⚽ Gol · Barrio FC</span>
            <span className="font-bold">68′</span>
          </p>
        </div>

        {/* Tabla de posiciones, superpuesta abajo a la derecha */}
        <div className="relative -mt-6 ml-8 rounded-2xl border border-[var(--lc-line)] bg-[var(--lc-surface)] p-5 shadow-2xl sm:ml-16 lg:rotate-[1.5deg]">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-bold">Tabla de posiciones</p>
            <span aria-hidden="true" className="text-[var(--lc-lime)]">↗</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-widest text-[var(--lc-muted)]">
                <th className="w-8 text-left font-medium">#</th>
                <th className="text-left font-medium">Equipo</th>
                <th className="w-10 text-right font-medium">PJ</th>
                <th className="w-10 text-right font-medium">PTS</th>
              </tr>
            </thead>
            <tbody>
              {STANDINGS.map((row, i) => (
                <tr key={row.team} className={i === 0 ? "bg-[var(--lc-lime)]/15 text-[var(--lc-lime)]" : ""}>
                  <td className="rounded-l-lg py-2 pl-2">{String(i + 1).padStart(2, "0")}</td>
                  <td className="py-2 font-medium">{row.team}</td>
                  <td className="py-2 text-right">{row.played}</td>
                  <td className="rounded-r-lg py-2 pr-2 text-right font-bold">{row.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="relative mt-5 hidden text-[10px] font-bold uppercase tracking-[0.3em] text-[var(--lc-white)]/70 sm:block">
          Cada partido cuenta.
        </p>
      </div>
      <p className="mt-4 text-center text-[11px] font-bold uppercase tracking-widest text-[var(--lc-muted)]">
        Vista ilustrativa · datos de ejemplo
      </p>
    </div>
  );
}

const STANDINGS = [
  { team: "Barrio FC", played: 5, points: 13 },
  { team: "Deportivo Sur", played: 5, points: 10 },
  { team: "Unión Central", played: 5, points: 9 },
];

function Team({ initial, name, dark = false }: { initial: string; name: string; dark?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <span
        className={`lc-display flex h-14 w-12 items-center justify-center rounded-b-2xl rounded-t-md text-3xl ${
          dark ? "bg-[#1f5a39] text-white" : "bg-[var(--lc-ink)]/10 text-[var(--lc-ink)]"
        }`}
      >
        {initial}
      </span>
      <span className="text-sm font-semibold">{name}</span>
    </div>
  );
}
