import type { ReactNode } from "react";

// Íconos de 18 px para los ítems de la variante `menu` de `Picklist` (especificación 022).
const stroke = { stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round", fill: "none" } as const;
const svg = (children: ReactNode) => (
  <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true">
    {children}
  </svg>
);

/** Íconos de 18 px para los ítems del menú. */
export const actionIcons = {
  share: svg(<path d="M10 12.5V3m0 0L6.5 6.5M10 3l3.5 3.5M4.5 10.5v5A1.5 1.5 0 006 17h8a1.5 1.5 0 001.5-1.5v-5" {...stroke} />),
  edit: svg(<path d="M12.5 4.5l3 3M4 16l.7-3.3L13.4 4a1.4 1.4 0 012 0l.6.6a1.4 1.4 0 010 2l-8.7 8.7L4 16z" {...stroke} />),
  desk: svg(<path d="M3 7h14M5 7v9M15 7v9M3 4h14v3H3zM8 11h4" {...stroke} />),
  swap: svg(<path d="M4 7h11m0 0l-3-3m3 3l-3 3M16 13H5m0 0l3-3m-3 3l3 3" {...stroke} />),
  season: svg(<path d="M4 6a2 2 0 012-2h8a2 2 0 012 2v9a1 1 0 01-1 1H5a1 1 0 01-1-1V6zM4 8h12M7 2.5V5m6-2.5V5" {...stroke} />),
  undo: svg(<path d="M7 5L3.5 8.5 7 12M4 8.5h7.5a4 4 0 010 8H9" {...stroke} />),
};
