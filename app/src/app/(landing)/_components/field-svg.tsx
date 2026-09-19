export function FieldSvg({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 800 500"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      {/* Field outline */}
      <rect x="40" y="40" width="720" height="420" rx="0" stroke="currentColor" strokeWidth="2" opacity="0.15" />

      {/* Center line */}
      <line x1="400" y1="40" x2="400" y2="460" stroke="currentColor" strokeWidth="2" opacity="0.15" />

      {/* Center circle */}
      <circle cx="400" cy="250" r="80" stroke="currentColor" strokeWidth="2" opacity="0.15" />

      {/* Center dot */}
      <circle cx="400" cy="250" r="4" fill="currentColor" opacity="0.15" />

      {/* Left penalty area */}
      <rect x="40" y="130" width="140" height="240" stroke="currentColor" strokeWidth="2" opacity="0.1" />

      {/* Left goal area */}
      <rect x="40" y="190" width="50" height="120" stroke="currentColor" strokeWidth="2" opacity="0.1" />

      {/* Left penalty arc */}
      <path d="M180 210 A40 40 0 0 1 180 290" stroke="currentColor" strokeWidth="2" opacity="0.1" />

      {/* Right penalty area */}
      <rect x="620" y="130" width="140" height="240" stroke="currentColor" strokeWidth="2" opacity="0.1" />

      {/* Right goal area */}
      <rect x="710" y="190" width="50" height="120" stroke="currentColor" strokeWidth="2" opacity="0.1" />

      {/* Right penalty arc */}
      <path d="M620 210 A40 40 0 0 0 620 290" stroke="currentColor" strokeWidth="2" opacity="0.1" />

      {/* Corner arcs */}
      <path d="M40 50 A10 10 0 0 1 50 40" stroke="currentColor" strokeWidth="2" opacity="0.1" />
      <path d="M750 40 A10 10 0 0 1 760 50" stroke="currentColor" strokeWidth="2" opacity="0.1" />
      <path d="M40 450 A10 10 0 0 0 50 460" stroke="currentColor" strokeWidth="2" opacity="0.1" />
      <path d="M750 460 A10 10 0 0 0 760 450" stroke="currentColor" strokeWidth="2" opacity="0.1" />
    </svg>
  );
}

export function BallSvg({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
      <circle cx="32" cy="32" r="30" stroke="currentColor" strokeWidth="2" />
      <path
        d="M32 2 L38 14 L52 14 L41 22 L45 36 L32 28 L19 36 L23 22 L12 14 L26 14 Z"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.3"
        transform="translate(0, 8) scale(0.8) translate(8, 0)"
      />
      <polygon points="32,12 37,22 32,28 27,22" fill="currentColor" opacity="0.15" />
      <polygon points="44,26 48,36 42,40 38,32" fill="currentColor" opacity="0.1" />
      <polygon points="20,26 24,32 18,40 14,36" fill="currentColor" opacity="0.1" />
      <polygon points="24,44 32,48 40,44 38,52 26,52" fill="currentColor" opacity="0.12" />
    </svg>
  );
}
