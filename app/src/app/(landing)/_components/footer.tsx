import Link from "next/link";

const LINK = "text-sm text-[var(--lc-muted)] transition-colors hover:text-[var(--lc-lime)]";
const HEADING = "mb-3 text-xs font-bold uppercase tracking-[0.16em] text-[var(--lc-white)]";

export function Footer() {
  return (
    <footer className="border-t border-[var(--lc-line)] px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="lc-display mb-3 text-3xl">
              Amateur<span className="text-[var(--lc-lime)]">.</span>
            </p>
            <p className="text-sm leading-relaxed text-[var(--lc-muted)]">
              Plataforma de gestión de torneos de fútbol amateur. Tu esfuerzo ya no queda invisible.
            </p>
          </div>

          <div>
            <p className={HEADING}>Producto</p>
            <ul className="space-y-2">
              <li><a href="#torneos" className={LINK}>Torneos</a></li>
              <li><a href="#plataforma" className={LINK}>La plataforma</a></li>
              <li><a href="#como-funciona" className={LINK}>Cómo funciona</a></li>
            </ul>
          </div>

          <div>
            <p className={HEADING}>Legal</p>
            <ul className="space-y-2">
              <li><Link href="/terminos" className={LINK}>Términos y condiciones</Link></li>
              <li><Link href="/privacidad" className={LINK}>Políticas de privacidad</Link></li>
            </ul>
          </div>

          <div>
            <p className={HEADING}>Soporte</p>
            <ul className="space-y-2">
              <li><Link href="/ayuda" className={LINK}>Centro de ayuda</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-[var(--lc-line)] pt-6">
          <p className="text-xs text-[var(--lc-muted)]">&copy; {new Date().getFullYear()} Amateur. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  );
}
