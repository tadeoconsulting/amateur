/** Escudo del club: su logo si lo subió, si no un círculo con su color de marca y sus
 * iniciales — usado como "foto de perfil" del club en fixtures, tablas de posiciones, etc.
 * Antes varias de estas listas solo mostraban un puntito de color o un círculo gris genérico. */
export function ClubCrest({
  club,
  size = "h-5 w-5",
  textSize = "text-[8px]",
}: {
  club: { shortName: string; logoUrl?: string | null; color?: string | null } | null | undefined;
  size?: string;
  textSize?: string;
}) {
  if (club?.logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- URL externa (Vercel Blob), no un asset local
      <img src={club.logoUrl} alt="" className={`${size} shrink-0 rounded-full object-cover`} />
    );
  }
  return (
    <div
      className={`flex ${size} shrink-0 items-center justify-center rounded-full`}
      style={{ backgroundColor: (club?.color || "#E5E7EB") + "20" }}
      aria-hidden="true"
    >
      <span className={`font-heading ${textSize} font-bold`} style={{ color: club?.color || "#6B7280" }}>
        {club?.shortName?.slice(0, 3) ?? "?"}
      </span>
    </div>
  );
}
