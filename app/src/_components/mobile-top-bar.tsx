import Link from "next/link";

/**
 * Barra superior fina del celular (hasta 767 px): «Amateur» a la izquierda y la cuenta (`account`, ver `AccountMenu`) a la
 * derecha. Desde 768 px la reemplaza `TopNav`. Solo va en las pantallas principales de cada rol, no en las de detalle.
 */
export function MobileTopBar({ homeHref, account }: { homeHref: string; account: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-40 border-b border-brand-200 bg-surface-primary md:hidden">
      <div className="mx-auto flex h-12 w-full max-w-[430px] items-center justify-between gap-3 px-4">
        <Link href={homeHref} className="shrink-0 font-heading text-base font-bold text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary">
          Amateur
        </Link>
        <div className="min-w-0">{account}</div>
      </div>
    </header>
  );
}
