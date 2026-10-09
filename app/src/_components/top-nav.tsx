import Link from "next/link";

export type TopNavItem = { href: string; label: string; active: boolean; badge?: number };

/**
 * Barra de navegación superior de escritorio (desde 768 px). En el celular las mismas secciones van
 * en la barra inferior de cada rol; acá pasan arriba, a todo el ancho, con la sección activa como
 * píldora oscura (el mismo estilo de las pestañas) y las insignias de pendientes.
 */
export function TopNav({ items, homeHref, label }: { items: TopNavItem[]; homeHref: string; label: string }) {
  return (
    <header className="sticky top-0 z-40 hidden border-b border-brand-200 bg-surface-primary md:block">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-8 px-8">
        <Link href={homeHref} className="font-heading text-lg font-bold text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary">
          Amateur
        </Link>
        <nav aria-label={label} className="flex items-center gap-1">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={item.active ? "page" : undefined}
              className={`inline-flex min-h-11 items-center gap-2 rounded-lg px-4 font-heading text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary ${
                item.active ? "bg-surface-secondary text-text-invert" : "text-text-secondary hover:bg-btn-regular hover:text-text-primary"
              }`}
            >
              {item.label}
              {!!item.badge && (
                <span
                  aria-label={`${item.badge} pendientes`}
                  className="inline-flex min-w-5 items-center justify-center rounded-full bg-verification px-1.5 text-[11px] font-bold leading-5 text-text-primary"
                >
                  {item.badge > 9 ? "9+" : item.badge}
                </span>
              )}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
