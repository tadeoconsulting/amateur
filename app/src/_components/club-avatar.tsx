/** Círculo con las iniciales del club sobre su color. */
export function ClubAvatar({
  shortName,
  color,
  size = 40,
}: {
  shortName: string;
  color: string | null;
  size?: number;
}) {
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
