/** Círculo con la imagen del club o, si no tiene, sus iniciales sobre su color. */
export function ClubAvatar({
  shortName,
  color,
  logoUrl,
  size = 40,
}: {
  shortName: string;
  color: string | null;
  logoUrl?: string | null;
  size?: number;
}) {
  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- URL externa (Vercel Blob), no un asset local
      <img src={logoUrl} alt="" aria-hidden="true" className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />
    );
  }
  return (
    <div
      aria-hidden="true"
      className="flex shrink-0 items-center justify-center rounded-full font-heading text-xs font-bold text-white"
      style={{ width: size, height: size, backgroundColor: color ?? "var(--color-brand-500)" }}
    >
      {shortName.slice(0, 3).toUpperCase()}
    </div>
  );
}
