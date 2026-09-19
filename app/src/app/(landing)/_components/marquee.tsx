export function Marquee() {
  const items = [
    "Fixture automático",
    "Tabla de posiciones",
    "Estadísticas en vivo",
    "Gestión de plantilla",
    "Perfil de jugador",
    "Control de sanciones",
    "Historial de partidos",
    "Validación de alineaciones",
  ];

  const repeated = [...items, ...items];

  return (
    <section className="relative bg-surface-secondary py-4 overflow-hidden border-y-2 border-field-green/30">
      <div
        className="flex gap-8 whitespace-nowrap motion-safe:animate-[marquee_25s_linear_infinite]"
        aria-label="Características principales"
      >
        {repeated.map((item, i) => (
          <span key={i} className="flex items-center gap-3 text-sm sm:text-base font-heading font-bold text-text-invert uppercase tracking-wider shrink-0">
            <span className="w-2 h-2 rounded-full bg-field-green" />
            {item}
          </span>
        ))}
      </div>
    </section>
  );
}
