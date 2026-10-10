"use client";

import { useParams } from "next/navigation";
import { useState, useCallback } from "react";
import Link from "next/link";
import { BackHeader } from "@/_components/back-header";
import { PlayerRosterRow } from "@/_components/player-roster-row";
import { ReleaseDialog } from "@/_components/release-dialog";
import { AssignDialog } from "@/_components/assign-dialog";
import { Toast } from "@/_components/toast";
import { getClubCategories, getClubPlayers } from "@/_lib/api";
import { useApi } from "@/_lib/use-api";
import { useMyClub } from "@/_lib/use-my-club";
import type { PlayerCategory, PlayerGender, PlayerStatus, RosterPlayer } from "@/_lib/types";
import { SubTabs } from "@/_components/sub-tabs";

const genderTabs: { key: PlayerGender; label: string }[] = [
  { key: "masculino", label: "Masculino" },
  { key: "femenino", label: "Femenino" },
  { key: "mixto", label: "Mixto" },
];

export default function ClubCategoryDetailPage() {
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
      <div className="w-full py-20 text-center text-text-secondary">
        Todavía no tienes un club.
      </div>
    );
  }

  return <ClubCategoryDetailContent key={club.id} clubId={club.id} />;
}

function ClubCategoryDetailContent({ clubId }: { clubId: string }) {
  const params = useParams<{ categoryId: string }>();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [gender, setGender] = useState<PlayerGender>("masculino");
  const [releasePlayer, setReleasePlayer] = useState<RosterPlayer | null>(null);
  const [assignPlayer, setAssignPlayer] = useState<RosterPlayer | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);

  const { data: playerCategories, loading: loadingCats } = useApi(() => getClubCategories(clubId));
  const { data: playersData, loading: loadingPlayers, refetch: refetchPlayers } = useApi(() =>
    getClubPlayers(clubId, { categoryId: params.categoryId })
  );

  const category = (playerCategories ?? []).find((c) => c.id === params.categoryId);
  const categoryPlayers: RosterPlayer[] = (playersData ?? []).map((p) => ({
    id: p.id,
    firstName: p.user.firstName,
    lastName: p.user.lastName,
    position: p.position ?? "",
    age: 0,
    categoryId: p.category?.id ?? params.categoryId,
    clubId,
    status: p.status as PlayerStatus,
    verified: true,
    avatarUrl: p.user.avatarUrl,
  }));
  const isSinCategoria = params.categoryId === "cat-sin";

  const togglePlayer = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const hasSelection = selectedIds.size > 0;

  const handleRelease = () => {
    if (selectedIds.size === 1) {
      const player = categoryPlayers.find((p) => p.id === [...selectedIds][0]);
      if (player) setReleasePlayer(player);
    }
  };

  const handleAssign = () => {
    if (selectedIds.size === 1) {
      const player = categoryPlayers.find((p) => p.id === [...selectedIds][0]);
      if (player) setAssignPlayer(player);
    }
  };

  const confirmRelease = async () => {
    if (!releasePlayer) return;
    setBusy(true);
    const res = await fetch(`/api/players/${releasePlayer.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      // Liberar saca al jugador del club (no solo de esta categoría): sin club no puede
      // quedarse con una categoría de ese club.
      body: JSON.stringify({ clubId: null, categoryId: null }),
    });
    setBusy(false);
    setReleasePlayer(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setToast({ message: data.error ?? "No se pudo liberar al jugador", tone: "error" });
      return;
    }
    setSelectedIds(new Set());
    setToast({ message: "Se liberó al jugador con éxito.", tone: "success" });
    refetchPlayers();
  };

  const confirmAssign = async (categoryId: string) => {
    if (!assignPlayer) return;
    setBusy(true);
    const res = await fetch(`/api/players/${assignPlayer.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId }),
    });
    setBusy(false);
    setAssignPlayer(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setToast({ message: data.error ?? "No se pudo asignar la nueva categoría", tone: "error" });
      return;
    }
    setSelectedIds(new Set());
    setToast({ message: "Se asignó al jugador a la nueva categoría.", tone: "success" });
    refetchPlayers();
  };

  if (loadingCats || loadingPlayers) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  if (!category) {
    return (
      <div className="w-full py-20 text-center text-text-secondary">
        Categoria no encontrada
      </div>
    );
  }

  return (
    <div className="w-full pb-24">
      {toast && <Toast message={toast.message} tone={toast.tone} onDismiss={() => setToast(null)} />}

      <BackHeader />

      {/* Title + Agregar */}
      <div className="flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-text-primary">
            <path
              d="M6 4h12v5a6 6 0 01-12 0V4zM9 14v2M15 14v2M7 16h10a1 1 0 011 1v1H6v-1a1 1 0 011-1z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <h1 className="font-heading text-xl font-bold text-text-primary">
            {isSinCategoria ? "Sin categoria" : `${category.name} Masculino`}
          </h1>
        </div>
        <Link
          href="/club/jugadores/invitar"
          className="rounded-lg bg-brand-900 px-4 py-2 text-sm font-semibold text-text-invert"
        >
          Agregar
        </Link>
      </div>

      {/* Info banner for sin categoria */}
      {isSinCategoria && (
        <div className="mx-4 mt-4 rounded-lg bg-brand-100 p-3">
          <p className="text-sm text-text-secondary">
            Los jugadores pueden ser movidos a otras categorias o liberados, solo debes seleccionarlos.
          </p>
        </div>
      )}

      {/* Gender sub-tabs for sin categoria */}
      {isSinCategoria && (
        <SubTabs label="Género" value={gender} onChange={setGender} tabs={genderTabs} />
      )}

      {/* Player List */}
      <div className={isSinCategoria ? "mt-2" : "mt-4"}>
        {categoryPlayers.map((player) => (
          <PlayerRosterRow
            key={player.id}
            player={player}
            selected={selectedIds.has(player.id)}
            onToggle={() => togglePlayer(player.id)}
          />
        ))}
        {categoryPlayers.length === 0 && (
          <p className="py-12 text-center text-sm text-text-secondary">
            No hay jugadores en esta categoria
          </p>
        )}
      </div>

      {/* Bottom action bar */}
      {(hasSelection || isSinCategoria) && (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-white px-4 py-4">
          <div className="mx-auto flex max-w-[430px] gap-3">
            <button
              onClick={handleRelease}
              disabled={!hasSelection || busy}
              className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-brand-900 py-3.5 font-heading text-sm font-semibold text-text-invert disabled:opacity-40"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M2 8h12M8 2l6 6-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Liberar
            </button>
            <button
              onClick={handleAssign}
              disabled={!hasSelection || busy}
              className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-brand-900 bg-white py-3.5 font-heading text-sm font-semibold text-text-primary disabled:opacity-40"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
                <path d="M5 8h6M8 5v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              Asignar
            </button>
          </div>
        </div>
      )}

      {/* Dialogs */}
      {releasePlayer && (
        <ReleaseDialog
          player={releasePlayer}
          onConfirm={confirmRelease}
          onCancel={() => setReleasePlayer(null)}
        />
      )}
      {assignPlayer && (
        <AssignDialog
          player={assignPlayer}
          categories={(playerCategories ?? []) as PlayerCategory[]}
          onConfirm={confirmAssign}
          onCancel={() => setAssignPlayer(null)}
        />
      )}
    </div>
  );
}
