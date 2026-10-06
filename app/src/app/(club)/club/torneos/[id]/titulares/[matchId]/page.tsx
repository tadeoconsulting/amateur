"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { getClubPlayers, type PlayerListItem } from "@/_lib/api";
import { PlayerAvatar } from "@/_components/player-avatar";
import { useApi } from "@/_lib/use-api";
import { useMyClub } from "@/_lib/use-my-club";
import { Toast } from "@/_components/toast";

export default function ClubTitularesPage() {
  const { club, loading: loadingClub } = useMyClub();

  if (loadingClub) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  if (!club) {
    return (
      <div className="px-4 py-20 text-center font-body text-sm text-text-secondary">
        Todavía no tienes un club.
      </div>
    );
  }

  return <ClubTitularesContent key={club.id} clubId={club.id} />;
}

function ClubTitularesContent({ clubId }: { clubId: string }) {
  const { matchId } = useParams<{ id: string; matchId: string }>();

  const { data: playersData, loading } = useApi(() => getClubPlayers(clubId));
  const { data: lineup, loading: loadingLineup } = useApi<{ playerIds: string[] }>(() =>
    fetch(`/api/matches/${matchId}/lineup?clubId=${clubId}`).then((r) => r.json())
  );

  if (loading || loadingLineup || !playersData || !lineup) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  const availablePlayers = playersData.filter((p) => p.status === "activo");
  // key: la alineación guardada llega async — se monta el formulario recién cuando ya se
  // conoce, así el estado inicial de `selected` arranca con los titulares correctos (ver
  // "use-api.ts": pedir de nuevo con un efecto dispara el aviso de no tocar el estado en uno).
  return (
    <TitularesForm
      key={lineup.playerIds.join(",")}
      clubId={clubId}
      matchId={matchId}
      availablePlayers={availablePlayers}
      initialPlayerIds={lineup.playerIds}
    />
  );
}

function TitularesForm({
  clubId,
  matchId,
  availablePlayers,
  initialPlayerIds,
}: {
  clubId: string;
  matchId: string;
  availablePlayers: PlayerListItem[];
  initialPlayerIds: string[];
}) {
  const { id } = useParams<{ id: string; matchId: string }>();
  const maxTitulares = 15;

  const [selected, setSelected] = useState<Set<string>>(() => new Set(initialPlayerIds));
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);

  const togglePlayer = (playerId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(playerId)) {
        next.delete(playerId);
      } else if (next.size < maxTitulares) {
        next.add(playerId);
      }
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    const res = await fetch(`/api/matches/${matchId}/lineup`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clubId, playerIds: [...selected] }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setToast({ message: data.error ?? "No se pudo guardar la alineación", tone: "error" });
      return;
    }
    setToast({ message: "Alineación guardada.", tone: "success" });
  };

  return (
    <div className="flex min-h-dvh flex-col pb-4">
      {toast && <Toast message={toast.message} tone={toast.tone} onDismiss={() => setToast(null)} />}

      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        <Link href={`/club/torneos/${id}/partido/${matchId}`} className="shrink-0 p-1 text-text-primary">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <h1 className="font-heading text-lg font-bold text-text-primary">Definir titulares</h1>
      </div>

      {/* Counter */}
      <div className="mx-4 mt-2 rounded-xl border border-border-primary p-3 text-center">
        <p className="font-heading text-sm font-bold text-text-primary">
          Titulares | <span className="text-verification">{selected.size}</span>/{maxTitulares} jugadores
        </p>
      </div>

      {/* Players list */}
      <div className="mt-4 flex flex-col px-4">
        {availablePlayers.map((player) => {
          const isSelected = selected.has(player.id);
          return (
            <button
              key={player.id}
              onClick={() => togglePlayer(player.id)}
              className="flex cursor-pointer items-center gap-3 border-b border-border-primary py-3 text-left transition-colors hover:bg-btn-regular"
            >
              <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                isSelected
                  ? "border-verification bg-verification"
                  : "border-border-primary bg-white"
              }`}>
                {isSelected && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2.5 6l2.5 2.5 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>

              <PlayerAvatar avatarUrl={player.user.avatarUrl} size="h-9 w-9" iconSize={14} iconClass="text-text-secondary" />

              <div className="min-w-0 flex-1">
                <p className="font-heading text-sm font-semibold text-text-primary">
                  {player.user.firstName} {player.user.lastName}
                </p>
                <p className="font-body text-xs text-text-secondary">{player.position ?? "Sin posicion"}</p>
              </div>
            </button>
          );
        })}
        {availablePlayers.length === 0 && (
          <p className="py-12 text-center text-sm text-text-secondary">
            No hay jugadores disponibles para definir titulares
          </p>
        )}
      </div>

      {/* Save button */}
      <div className="mt-6 px-4">
        <button
          onClick={handleSave}
          disabled={selected.size === 0 || saving}
          className="w-full cursor-pointer rounded-lg bg-surface-secondary py-3 font-heading text-sm font-bold text-text-invert transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>
    </div>
  );
}
