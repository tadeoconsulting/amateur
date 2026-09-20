"use client";

import { useState } from "react";
import { useApi } from "@/_lib/use-api";
import { useMyClub, type MyClub } from "@/_lib/use-my-club";
import { Toast } from "@/_components/toast";

function LinkBox({ club }: { club: MyClub }) {
  const { data: link, refetch } = useApi<{ token: string; path: string }>(() =>
    fetch(`/api/clubs/${club.id}/invite-link`).then((r) => r.json())
  );
  const [toast, setToast] = useState<string | null>(null);
  const [confirmRotate, setConfirmRotate] = useState(false);
  const [busy, setBusy] = useState(false);

  const url = link ? `${window.location.origin}${link.path}` : "";

  async function share() {
    if (!url) return;
    // En el celular se abre el menú de compartir (WhatsApp, etc.); en la computadora, se copia.
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: club.name, text: `Únete a ${club.name} en Amateur`, url });
        return;
      } catch (e) {
        if ((e as DOMException).name === "AbortError") return; // la persona cerró el menú
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setToast("Link copiado al portapapeles.");
    } catch {
      setToast("No se pudo copiar. Copia el link a mano.");
    }
  }

  async function rotate() {
    setBusy(true);
    setConfirmRotate(false);
    try {
      const res = await fetch(`/api/clubs/${club.id}/invite-link`, { method: "POST" });
      if (res.ok) {
        refetch();
        setToast("Link nuevo generado. El anterior dejó de funcionar.");
      } else {
        setToast("No se pudo generar el link nuevo.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
      <p className="mt-2 text-sm text-text-secondary">
        Comparte este link para que el jugador se una directamente a {club.name}.
      </p>
      <div className="mt-4 flex items-center gap-2">
        <div className="min-w-0 flex-1 rounded-lg border border-brand-200 bg-white px-3 py-2.5">
          <span className="block truncate text-sm text-text-secondary">{url || "Generando link..."}</span>
        </div>
        <button
          onClick={share}
          disabled={!url}
          className="cursor-pointer rounded-lg bg-brand-900 px-4 py-2.5 text-sm font-semibold text-text-invert disabled:opacity-50"
        >
          Compartir
        </button>
      </div>

      <div className="mt-3 text-center">
        {confirmRotate ? (
          <span className="text-xs text-text-secondary">
            El link anterior dejará de funcionar.{" "}
            <button onClick={rotate} disabled={busy} className="cursor-pointer font-semibold text-text-primary underline">
              Generar nuevo
            </button>{" "}
            ·{" "}
            <button onClick={() => setConfirmRotate(false)} className="cursor-pointer text-text-secondary underline">
              Cancelar
            </button>
          </span>
        ) : (
          <button onClick={() => setConfirmRotate(true)} className="cursor-pointer text-xs text-text-secondary underline">
            Generar un link nuevo
          </button>
        )}
      </div>
    </>
  );
}

/** Tarjeta "Invitar por WhatsApp": el link real del club de quien tiene la sesión. */
export function InviteLinkCard() {
  const { club, loading } = useMyClub();
  return (
    <div className="rounded-xl bg-[#d4e5ff] p-4">
      <h2 className="font-heading text-lg font-bold text-text-primary">Invitar por WhatsApp</h2>
      {loading ? (
        <p className="mt-2 text-sm text-text-secondary">Cargando...</p>
      ) : club ? (
        <LinkBox club={club} />
      ) : (
        <p className="mt-2 text-sm text-text-secondary">
          Para invitar jugadores por link primero necesitas tener un equipo. Créalo desde el perfil de equipo.
        </p>
      )}
    </div>
  );
}
