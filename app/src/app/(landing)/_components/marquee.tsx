const ITEMS = ["Fixture automático", "Estadísticas en vivo", "Perfil de jugador", "Tabla de posiciones", "Control de sanciones", "Temporadas"];

export function Marquee() {
  const repeated = [...ITEMS, ...ITEMS];

  return (
    <section className="overflow-hidden border-y border-[var(--lc-line)] bg-[var(--lc-lime)] py-3 text-[var(--lc-ink)]" aria-label="Lo que hace Amateur">
      <div className="flex w-max gap-8 whitespace-nowrap motion-safe:animate-[marquee_28s_linear_infinite]">
        {repeated.map((item, i) => (
          <span key={i} className="lc-display flex shrink-0 items-center gap-8 text-xl sm:text-2xl">
            {item}
            <span aria-hidden="true">✳</span>
          </span>
        ))}
      </div>
    </section>
  );
}
