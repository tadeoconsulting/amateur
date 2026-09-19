"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BackHeader } from "@/_components/back-header";
import { Toast } from "@/_components/toast";
import { searchUsers, type UserItem } from "@/_lib/api";

export default function BuscarDelegadoPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
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

  const handleSave = () => {
    if (!selectedId) return;
    setToast("Director técnico vinculado con éxito.");
    setTimeout(() => router.push("/club/equipo"), 1200);
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
                        {person.roles[0] ?? "Usuario"} | {person.email}
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
                  <p className="py-8 text-center text-sm text-text-secondary">
                    No se encontraron resultados
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Bottom button */}
      <div className="px-4 pb-6 pt-4">
        <button
          onClick={handleSave}
          disabled={!selectedId}
          className="w-full cursor-pointer rounded-xl bg-brand-900 py-3.5 font-heading text-sm font-semibold text-text-invert disabled:opacity-40"
        >
          Guardar Cambios
        </button>
      </div>
    </div>
  );
}
