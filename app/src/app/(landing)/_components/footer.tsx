import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-surface-primary border-t border-brand-200 py-12 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
          <div>
            <p className="font-heading text-xl font-bold text-text-primary mb-3">Amateur</p>
            <p className="text-sm text-text-secondary font-body leading-relaxed">
              Plataforma de gestión de torneos de fútbol amateur. Tu esfuerzo ya no queda invisible.
            </p>
          </div>

          <div>
            <p className="text-sm font-bold text-text-primary mb-3 uppercase tracking-wider">Producto</p>
            <ul className="space-y-2">
              <li><a href="#features" className="text-sm text-text-secondary hover:text-text-primary transition-colors">Características</a></li>
              <li><a href="#como-funciona" className="text-sm text-text-secondary hover:text-text-primary transition-colors">Cómo funciona</a></li>
              <li><a href="#numeros" className="text-sm text-text-secondary hover:text-text-primary transition-colors">Números</a></li>
            </ul>
          </div>

          <div>
            <p className="text-sm font-bold text-text-primary mb-3 uppercase tracking-wider">Legal</p>
            <ul className="space-y-2">
              <li><Link href="/terminos" className="text-sm text-text-secondary hover:text-text-primary transition-colors">Términos y condiciones</Link></li>
              <li><Link href="/privacidad" className="text-sm text-text-secondary hover:text-text-primary transition-colors">Políticas de privacidad</Link></li>
            </ul>
          </div>

          <div>
            <p className="text-sm font-bold text-text-primary mb-3 uppercase tracking-wider">Soporte</p>
            <ul className="space-y-2">
              <li><Link href="/ayuda" className="text-sm text-text-secondary hover:text-text-primary transition-colors">Centro de ayuda</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-brand-200 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-text-secondary">
            &copy; {new Date().getFullYear()} Amateur. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
