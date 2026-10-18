import Link from "next/link";

/**
 * Ajustes en el encabezado de las pantallas principales del club. En el celular la barra inferior le cedió su lugar a
 * Gestión; en escritorio sigue en la barra superior, así que acá se oculta.
 */
export function ClubSettingsLink() {
  return (
    <Link href="/club/ajustes" aria-label="Ajustes" className="-mr-2 flex h-11 w-11 items-center justify-center text-text-primary md:hidden">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    </Link>
  );
}
