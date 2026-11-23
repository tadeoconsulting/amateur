// El registro que mantiene sincronizados el design system y el sistema (especificación 022).
//
// Regla: todo archivo de `src/_components/` está en UNA de estas tres listas. La prueba `tests/unit/design-system-registro.test.mjs`
// falla si aparece un archivo nuevo sin clasificar, o si uno «documentado» deja de usarse en su página del design system. Así, un
// componente, campo, texto o tipografía nuevos no pueden llegar a la plataforma sin pasar por el design system, y al revés: lo que
// el design system muestra son los componentes reales (no copias).
//
// - `documentados`: la página del design system los importa y los muestra.
// - `pendientes`: son piezas de interfaz reutilizables que el design system todavía no muestra. Es la deuda visible: se van
//   moviendo a `documentados` (nunca se agregan componentes nuevos aquí: un componente nuevo se documenta al crearlo).
// - `dominio`: componentes de una pantalla o de un tema (partidos, clubes, torneos…), no piezas del design system.
//
// Rutas relativas a `src/`. `pagina` es la carpeta dentro de `src/app/design-system/`.

export const documentados: { archivo: string; pagina: string }[] = [
  { archivo: "_components/label.tsx", pagina: "inputs" },
  { archivo: "_components/field.tsx", pagina: "inputs" },
  { archivo: "_components/field-styles.ts", pagina: "inputs" },
  { archivo: "_components/text-field.tsx", pagina: "inputs" },
  { archivo: "_components/picklist.tsx", pagina: "inputs" },
  { archivo: "_components/picklist-icons.tsx", pagina: "inputs" },
  { archivo: "_components/password-input.tsx", pagina: "inputs" },
  { archivo: "_components/date-picker.tsx", pagina: "inputs" },
  { archivo: "_components/time-picker.tsx", pagina: "inputs" },
  { archivo: "_components/button-styles.ts", pagina: "buttons" },
  { archivo: "_components/tabs.tsx", pagina: "tabs" },
];

export const pendientes: string[] = [
  "_components/accordion.tsx",
  "_components/account-menu.tsx",
  "_components/assign-dialog.tsx",
  "_components/back-header.tsx",
  "_components/bottom-nav.tsx",
  "_components/mobile-top-bar.tsx",
  "_components/release-dialog.tsx",
  "_components/sheet.tsx",
  "_components/spinner.tsx",
  "_components/status-badge.tsx",
  "_components/toast.tsx",
  "_components/top-nav.tsx",
  "_components/tournament-photo-field.tsx",
];

export const dominio: string[] = [
  "_components/avatar-cropper.tsx",
  "_components/change-password-form.tsx",
  "_components/club-avatar.tsx",
  "_components/club-crest.tsx",
  "_components/club-page.tsx",
  "_components/compact-standings.tsx",
  "_components/convocatoria-link-card.tsx",
  "_components/convocatoria-view.tsx",
  "_components/delegates-panel.tsx",
  "_components/fee-status.tsx",
  "_components/fixture-tabs.tsx",
  "_components/fixture-with-standings.tsx",
  "_components/invite-link-card.tsx",
  "_components/legal-document.tsx",
  "_components/live-standings.tsx",
  "_components/match-card.tsx",
  "_components/match-detail.tsx",
  "_components/match-row.tsx",
  "_components/match-sheet.tsx",
  "_components/match-timeline.tsx",
  "_components/mesa-manager.tsx",
  "_components/mobile-shell.tsx",
  "_components/password-rules.tsx",
  "_components/player-avatar.tsx",
  "_components/player-list-row.tsx",
  "_components/player-roster-row.tsx",
  "_components/player-sanction-row.tsx",
  "_components/public-club-view.tsx",
  "_components/public-match-view.tsx",
  "_components/request-status-chip.tsx",
  "_components/season-public-view.tsx",
  "_components/season-results.tsx",
  "_components/season-stages.tsx",
  "_components/share-view-button.tsx",
  "_components/switch-account.tsx",
  "_components/teams-list.tsx",
  "_components/top-scorer-row.tsx",
  "_components/tournament-card.tsx",
  "_components/tournament-header.tsx",
  "_components/tournament-logo.tsx",
  "_components/tournament-match-card.tsx",
  "_components/tournament-results.tsx",
];
