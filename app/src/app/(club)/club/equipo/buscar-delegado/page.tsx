"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BackHeader } from "@/_components/back-header";
import { Toast } from "@/_components/toast";
import { searchUsers, type UserItem } from "@/_lib/api";
import { useMyClub } from "@/_lib/use-my-club";

export default function BuscarDelegadoPage() {
  const router = useRouter();
  const { club } = useMyClub();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [invited, setInvited] = useState(false);

  useEffect(() => {
    setInvited(false);
    setInviteEmail("");
    setInviteError("");
    const term = query.trim();
    if (term.length === 0) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const timer = setTimeout(() => {
      searchUsers({ search: term })
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const showResults = query.trim().length > 0;

  // Cuando no aparece en la búsqueda es porque todavía no tiene cuenta: se le manda una
  // invitación por correo (la acepta él mismo, creando su cuenta, desde /staff/invitacion).
  const handleInvite = async () => {
    const email = inviteEmail.trim();
    if (!email || !club || inviting) return;
    setInviteError("");
    setInviting(true);
    try {
      const res = await fetch(`/api/clubs/${club.id}/staff-invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role: "director_tecnico" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setInviteError(data.error ?? "No se pudo enviar la invitación.");
        return;
      }
      setInvited(true);
      setToast(
        data.alreadyInvited
          ? "Ya tenía una invitación pendiente."
          : data.emailed
            ? "Se envió la invitación por correo."
            : "Invitación creada, pero el correo no pudo enviarse todavía."
      );
    } catch {
      setInviteError("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setInviting(false);
    }
  };

  const handleSave = async () => {
    if (!selectedId || !club || saving) return;
    setError("");
    setSaving(true);
    try {
      const res = await fetch(`/api/clubs/${club.id}/staff`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedId, role: "director_tecnico" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "No se pudo vincular al director técnico.");
        return;
      }
      setToast("Director técnico vinculado con éxito.");
      setTimeout(() => router.push("/club/equipo"), 1200);
    } catch {
      setError("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-dvh w-full flex-col">
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}

      <BackHeader />

      <div className="flex-1 px-4">
        <h1 className="font-heading text-xl font-bold text-text-primary">
          Agregar Director Técnico
        </h1>

        {/* Search */}
        <div className="mt-2">
          <p className="text-sm text-text-secondary">Ingresar ID o usuario</p>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ingresa el nombre o apellido"
            className="mt-1 w-full rounded-lg bg-brand-100 px-3 py-3 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none"
          />
        </div>

        {/* Results */}
        {showResults && (
          <div className="mt-4 space-y-1">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
              </div>
            ) : (
              <>
                {results.map((person) => (
                  <div key={person.id} className="flex items-center gap-3 py-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-300 text-sm font-semibold text-text-secondary">
                      {person.firstName[0]}
                      {person.lastName[0]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-heading font-bold text-text-primary">
                        {person.firstName} {person.lastName}
                      </p>
                      <p className="text-sm text-text-secondary">
                        {person.roles[0] ?? "Usuario"}
                        {person.email ? ` | ${person.email}` : ""}
                      </p>
                    </div>
                    {selectedId === person.id ? (
                      <span className="shrink-0 text-sm font-semibold text-text-primary">
                        Seleccionado
                      </span>
                    ) : (
                      <button
                        onClick={() => setSelectedId(person.id)}
                        className="shrink-0 cursor-pointer text-sm font-semibold text-text-primary underline"
                      >
                        Vincular
                      </button>
                    )}
                  </div>
                ))}
                {results.length === 0 && (
                  <div className="py-8 text-center">
                    <p className="text-sm text-text-secondary">
                      No se encontraron resultados
                    </p>
                    {invited ? (
                      <p className="mt-4 text-sm font-semibold text-text-primary">
                        Invitación enviada a {inviteEmail.trim()}.
                      </p>
                    ) : (
                      <div className="mt-4 space-y-2 text-left">
                        <p className="text-sm text-text-secondary">
                          Si todavía no tiene cuenta, invítalo por correo:
                        </p>
                        <input
                          type="email"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          placeholder="correo@ejemplo.com"
                          className="w-full rounded-lg bg-brand-100 px-3 py-3 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none"
                        />
                        {inviteError && <p className="font-body text-sm text-red-600">{inviteError}</p>}
                        <button
                          onClick={handleInvite}
                          disabled={!inviteEmail.trim() || inviting}
                          className="w-full cursor-pointer rounded-lg border border-brand-900 py-2.5 font-heading text-sm font-semibold text-text-primary disabled:opacity-40"
                        >
                          {inviting ? "Enviando..." : "Invitar por correo"}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Bottom button */}
      <div className="px-4 pb-6 pt-4">
        {error && <p className="mb-2 font-body text-sm text-red-600">{error}</p>}
        <button
          onClick={handleSave}
          disabled={!selectedId || saving}
          className="w-full cursor-pointer rounded-xl bg-brand-900 py-3.5 font-heading text-sm font-semibold text-text-invert disabled:opacity-40"
        >
          {saving ? "Guardando..." : "Guardar Cambios"}
        </button>
      </div>
    </div>
  );
}
