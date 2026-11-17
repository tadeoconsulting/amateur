"use client";

import { ActionsMenu, actionIcons, type ActionItem } from "@/_components/actions-menu";
import { useShareView } from "@/_components/share-view-button";
import type { ShareView } from "@/_lib/share-view";

/**
 * El menú «Acciones» de la pantalla de un torneo (especificación 021): junta las acciones secundarias que antes estaban
 * sueltas (Compartir, Editar torneo, Mesa, Editar cruces, Crear temporada y Deshacer fixture). Cada una aparece solo
 * cuando corresponde; «Agregar partido» no va aquí: es un tab con «+» junto a los tabs.
 */
export function TournamentActions({
  tournamentId,
  title,
  publicPath,
  shareView,
  isConvocatoria,
  canCreateSeason,
  canEditCruces,
  canUndoFixture,
  onUndoFixture,
}: {
  tournamentId: string;
  title: string;
  publicPath: string;
  shareView: ShareView;
  /** Un torneo en convocatoria todavía no está en marcha: sin Compartir, Mesa, Editar cruces ni Deshacer fixture. */
  isConvocatoria: boolean;
  /** Una liga que todavía no pertenece a una temporada. */
  canCreateSeason: boolean;
  /** Hay algún partido que no es decisivo (se puede reacomodar el fixture). */
  canEditCruces: boolean;
  /** Todos los partidos siguen programados y sin jugadas. */
  canUndoFixture: boolean;
  onUndoFixture: () => void;
}) {
  const { share, toast } = useShareView({ title, publicPath, view: shareView });

  const candidates: (ActionItem | false)[] = [
    !isConvocatoria && { key: "compartir", label: "Compartir", icon: actionIcons.share, onSelect: share },
    { key: "editar", label: "Editar torneo", icon: actionIcons.edit, href: `/torneos/${tournamentId}/editar` },
    !isConvocatoria && { key: "mesa", label: "Mesa", icon: actionIcons.desk, href: `/torneos/${tournamentId}/mesa` },
    // Cambiar equipos y mover partidos de fecha sin que nadie juegue dos veces en una fecha (especificación 017).
    !isConvocatoria && canEditCruces && { key: "cruces", label: "Editar cruces", icon: actionIcons.swap, href: `/torneos/${tournamentId}/editar-cruces` },
    canCreateSeason && { key: "temporada", label: "Crear temporada con este torneo", icon: actionIcons.season, href: `/torneos/temporadas/nueva?apertura=${tournamentId}` },
    !isConvocatoria && canUndoFixture && { key: "deshacer", label: "Deshacer fixture", icon: actionIcons.undo, onSelect: onUndoFixture, tone: "danger", separated: true },
  ];
  const items = candidates.filter((item): item is ActionItem => item !== false);

  return (
    <>
      {toast}
      <ActionsMenu items={items} />
    </>
  );
}
