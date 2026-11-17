import Link from "next/link";

/**
 * La campana de notificaciones del organizador: va en la barra de arriba, a la izquierda de la cuenta (el layout deja 16 px
 * entre las dos). Todo el cuadro de 44 px es clicable, no solo el dibujo.
 */
export function NotificationsLink() {
  return (
    <Link
      href="/notificaciones"
      aria-label="Notificaciones"
      className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-text-primary transition-colors hover:bg-btn-regular focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary"
    >
      <svg aria-hidden width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9zM13.73 21a2 2 0 01-3.46 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </Link>
  );
}
