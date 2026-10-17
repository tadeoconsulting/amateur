import Link from "next/link";

const LINK = "text-sm transition-colors hover:text-[var(--lc-lime)]";

export function Footer() {
  return (
    <footer className="px-4 pb-10 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="flex items-center gap-2.5" aria-label="Amateur">
            <span className="lc-display normal-case flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--lc-lime)] text-2xl italic text-[var(--lc-ink)]">a</span>
            <span className="text-3xl font-bold tracking-tight">amateur</span>
          </Link>
          <nav aria-label="Enlaces" className="flex flex-wrap gap-x-8 gap-y-3">
            <a href="#torneos" className={LINK}>Torneos</a>
            <a href="#plataforma" className={LINK}>La plataforma</a>
            <a href="#como-funciona" className={LINK}>Cómo funciona</a>
            <Link href="/ayuda" className={LINK}>Centro de ayuda ↗</Link>
          </nav>
        </div>

        <p className="mt-8 max-w-sm text-sm leading-relaxed text-[var(--lc-muted)]">
          Plataforma de gestión de torneos de fútbol amateur.
          <br />
          Tu esfuerzo ya no queda invisible.
        </p>

        <div className="mt-8 flex flex-col gap-3 border-t border-[var(--lc-line)] pt-6 text-xs text-[var(--lc-muted)] sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {new Date().getFullYear()} Amateur. Todos los derechos reservados.</p>
          <div className="flex gap-6">
            <Link href="/terminos" className="hover:text-[var(--lc-lime)]">Términos y condiciones</Link>
            <Link href="/privacidad" className="hover:text-[var(--lc-lime)]">Políticas de privacidad</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
