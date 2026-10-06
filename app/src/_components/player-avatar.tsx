/**
 * Foto de perfil de un jugador: su foto si la subió; si no, el círculo con el ícono de persona.
 * Se usa en todos los lugares donde aparecen los datos de un jugador (goleadores, plantillas,
 * listas, alineaciones), para que su foto se vea siempre donde corresponde.
 */
export function PlayerAvatar({
  avatarUrl,
  size = "h-10 w-10",
  iconSize = 20,
  background = "bg-brand-300",
  iconClass = "text-brand-500",
}: {
  avatarUrl?: string | null;
  /** Clases de Tailwind del tamaño del círculo (alto y ancho). */
  size?: string;
  iconSize?: number;
  background?: string;
  iconClass?: string;
}) {
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- URL externa (Vercel Blob), no un asset local
      <img src={avatarUrl} alt="" className={`${size} shrink-0 rounded-full object-cover`} />
    );
  }
  return (
    <div className={`flex ${size} shrink-0 items-center justify-center rounded-full ${background}`} aria-hidden="true">
      <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" className={iconClass}>
        <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" />
        <path d="M5 20c0-3.87 3.13-7 7-7s7 3.13 7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </div>
  );
}
