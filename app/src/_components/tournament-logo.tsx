/** Foto del torneo: la que subió el organizador o el admin; si no hay, un círculo con un trofeo. */
export function TournamentLogo({
  logoUrl,
  size = "h-10 w-10",
  className = "",
}: {
  logoUrl: string | null | undefined;
  size?: string;
  className?: string;
}) {
  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- URL externa (Vercel Blob), no un asset local
      <img src={logoUrl} alt="" className={`${size} shrink-0 rounded-full object-cover ${className}`} />
    );
  }
  return (
    <div className={`flex ${size} shrink-0 items-center justify-center rounded-full bg-[#3D1952] ${className}`} aria-hidden="true">
      <svg width="55%" height="55%" viewBox="0 0 16 16" fill="none" className="text-white">
        <path
          d="M4 2h8v4a4 4 0 01-8 0V2zM3 3H1.5a.5.5 0 00-.5.5v1a2 2 0 002 2H3M13 3h1.5a.5.5 0 01.5.5v1a2 2 0 01-2 2h-.5M6 10v2M10 10v2M5 12h6a1 1 0 011 1v1H4v-1a1 1 0 011-1z"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
