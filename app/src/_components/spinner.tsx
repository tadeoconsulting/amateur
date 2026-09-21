/** Indicador de carga. `role="status"` para que un lector de pantalla lo anuncie. */
export function Spinner({ size = 24, label = "Cargando" }: { size?: number; label?: string }) {
  return (
    <span
      role="status"
      aria-label={label}
      style={{ width: size, height: size }}
      className="inline-block shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none"
    />
  );
}

/** Pantalla completa de carga, con el mismo aspecto que usan las demás pantallas. */
export function PageSpinner() {
  return (
    <div className="flex items-center justify-center py-20 text-brand-500">
      <Spinner />
    </div>
  );
}
