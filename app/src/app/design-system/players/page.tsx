"use client";

import { useState } from "react";
import { PlayerRosterRow } from "@/_components/player-roster-row";
import { ReleaseDialog } from "@/_components/release-dialog";
import { AssignDialog } from "@/_components/assign-dialog";
import { Toast } from "@/_components/toast";
import { BottomNav } from "@/_components/bottom-nav";
import { rosterPlayers, playerCategories, communityPlayers } from "@/_lib/mock-data";
import type { RosterPlayer } from "@/_lib/types";

export default function PlayersComponentsPage() {
  const [selectedDemo, setSelectedDemo] = useState<Set<string>>(new Set());
  const [showRelease, setShowRelease] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const demoPlayer = rosterPlayers[0];
  const waitingPlayer = rosterPlayers.find((p) => p.status === "en_espera")!;

  const toggleDemo = (id: string) => {
    setSelectedDemo((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <>
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}

      <header className="mb-10">
        <p className="text-xs font-semibold tracking-[0.08em] text-verification uppercase">
          Components
        </p>
        <h1 className="mt-2 font-heading text-3xl font-bold text-text-primary">
          Players
        </h1>
        <p className="mt-3 max-w-xl font-body text-base leading-relaxed text-text-secondary">
          Componentes reutilizables para el modulo de jugadores: filas de roster,
          dialogos de liberar/asignar, toast de confirmacion y barra de navegacion.
          Importados desde <code className="rounded bg-brand-300 px-1 text-xs">@/_components/</code>.
        </p>
      </header>

      {/* PlayerRosterRow */}
      <Section title="PlayerRosterRow">
        <div className="rounded-xl border border-brand-200 bg-white">
          <p className="px-6 pt-4 text-xs font-medium text-text-secondary uppercase tracking-wider">
            Con checkbox (activo, verificado)
          </p>
          <div className="mx-auto max-w-[430px]">
            {rosterPlayers.slice(0, 3).map((p) => (
              <PlayerRosterRow
                key={p.id}
                player={p}
                selected={selectedDemo.has(p.id)}
                onToggle={() => toggleDemo(p.id)}
              />
            ))}
          </div>
          <p className="px-6 pt-4 text-xs font-medium text-text-secondary uppercase tracking-wider">
            Estado &quot;en espera&quot;
          </p>
          <div className="mx-auto max-w-[430px]">
            <PlayerRosterRow player={waitingPlayer} />
          </div>
          <p className="px-6 pt-4 text-xs font-medium text-text-secondary uppercase tracking-wider">
            Con action slot personalizado (ej: Invitar)
          </p>
          <div className="mx-auto max-w-[430px] pb-2">
            <PlayerRosterRow
              player={communityPlayers[0]}
              action={
                <button className="shrink-0 text-sm font-medium text-text-primary underline">
                  Invitar
                </button>
              }
            />
            <PlayerRosterRow
              player={communityPlayers[1]}
              action={
                <span className="shrink-0 text-sm font-medium text-verification">Invitado</span>
              }
            />
          </div>
        </div>
        <CodeRef
          component="PlayerRosterRow"
          path="@/_components/player-roster-row.tsx"
          props={[
            "player: RosterPlayer",
            "selected?: boolean",
            "onToggle?: () => void",
            "action?: React.ReactNode",
          ]}
        />
      </Section>

      {/* ReleaseDialog */}
      <Section title="ReleaseDialog">
        <div className="rounded-xl border border-brand-200 bg-white p-6">
          <p className="mb-3 text-xs font-medium text-text-secondary uppercase tracking-wider">
            Bottom sheet de confirmacion para liberar jugador
          </p>
          <button
            onClick={() => setShowRelease(true)}
            className="rounded-xl bg-brand-900 px-6 py-3 text-sm font-semibold text-text-invert"
          >
            Abrir ReleaseDialog
          </button>
        </div>
        <CodeRef
          component="ReleaseDialog"
          path="@/_components/release-dialog.tsx"
          props={[
            "player: RosterPlayer",
            "onConfirm: () => void",
            "onCancel: () => void",
          ]}
        />
      </Section>

      {/* AssignDialog */}
      <Section title="AssignDialog">
        <div className="rounded-xl border border-brand-200 bg-white p-6">
          <p className="mb-3 text-xs font-medium text-text-secondary uppercase tracking-wider">
            Bottom sheet para asignar jugador a nueva categoria
          </p>
          <button
            onClick={() => setShowAssign(true)}
            className="rounded-xl bg-brand-900 px-6 py-3 text-sm font-semibold text-text-invert"
          >
            Abrir AssignDialog
          </button>
        </div>
        <CodeRef
          component="AssignDialog"
          path="@/_components/assign-dialog.tsx"
          props={[
            "player: RosterPlayer",
            "categories: PlayerCategory[]",
            "onConfirm: (categoryId: string) => void",
            "onCancel: () => void",
          ]}
        />
      </Section>

      {/* Toast */}
      <Section title="Toast">
        <div className="rounded-xl border border-brand-200 bg-white p-6">
          <p className="mb-3 text-xs font-medium text-text-secondary uppercase tracking-wider">
            Notificacion verde con auto-dismiss (3s)
          </p>
          <button
            onClick={() => setToast("Se libero al jugador con exito.")}
            className="rounded-xl bg-verification px-6 py-3 text-sm font-semibold text-white"
          >
            Mostrar Toast
          </button>
        </div>
        <CodeRef
          component="Toast"
          path="@/_components/toast.tsx"
          props={[
            "message: string",
            "onDismiss: () => void",
          ]}
        />
      </Section>

      {/* BottomNav */}
      <Section title="BottomNav">
        <div className="rounded-xl border border-brand-200 bg-white p-6">
          <p className="mb-3 text-xs font-medium text-text-secondary uppercase tracking-wider">
            Navegacion inferior con 4 tabs (Torneos, Jugadores, Equipo, Perfil)
          </p>
          <div className="relative mx-auto h-16 max-w-[430px] overflow-hidden rounded-b-xl border border-brand-200">
            <div className="absolute inset-x-0 bottom-0 border-t border-brand-200 bg-white">
              <div className="flex items-center justify-around py-2">
                {["Torneos", "Jugadores", "Equipo", "Perfil"].map((label) => (
                  <div
                    key={label}
                    className={`flex flex-col items-center gap-0.5 px-3 py-1 ${
                      label === "Jugadores" ? "text-text-primary" : "text-text-secondary"
                    }`}
                  >
                    <div className="h-6 w-6 rounded bg-brand-200" />
                    <span className={`text-[10px] ${label === "Jugadores" ? "font-semibold" : "font-medium"}`}>
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <p className="mt-3 text-xs text-text-secondary">
            El componente real usa <code className="rounded bg-brand-300 px-1">usePathname()</code> para
            determinar el tab activo. Arriba se muestra una representacion estatica.
          </p>
        </div>
        <CodeRef
          component="BottomNav"
          path="@/_components/bottom-nav.tsx"
          props={["(sin props)"]}
        />
      </Section>

      {/* Anatomy */}
      <section className="mt-14">
        <h2 className="font-heading text-xl font-bold text-text-primary">Anatomia</h2>
        <div className="mt-4 overflow-x-auto rounded-xl border border-brand-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-brand-200 text-[10px] text-text-secondary uppercase tracking-wider">
                <th className="px-4 py-2.5 font-medium">Componente</th>
                <th className="px-4 py-2.5 font-medium">Archivo</th>
                <th className="px-4 py-2.5 font-medium">Usado en</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-200 text-xs">
              {[
                ["PlayerRosterRow", "player-roster-row.tsx", "/jugadores/[catId], /jugadores/buscar"],
                ["ReleaseDialog", "release-dialog.tsx", "/jugadores/[catId]"],
                ["AssignDialog", "assign-dialog.tsx", "/jugadores/[catId]"],
                ["Toast", "toast.tsx", "/jugadores/[catId], /invitar, /buscar"],
                ["BottomNav", "bottom-nav.tsx", "/jugadores"],
              ].map(([comp, file, used]) => (
                <tr key={comp}>
                  <td className="px-4 py-2.5 font-medium text-text-primary">{comp}</td>
                  <td className="px-4 py-2.5 font-mono text-text-secondary">{file}</td>
                  <td className="px-4 py-2.5 text-text-secondary">{used}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Dialogs rendered on demand */}
      {showRelease && (
        <ReleaseDialog
          player={demoPlayer}
          onConfirm={() => {
            setShowRelease(false);
            setToast("Se libero al jugador con exito.");
          }}
          onCancel={() => setShowRelease(false)}
        />
      )}
      {showAssign && (
        <AssignDialog
          player={demoPlayer}
          categories={playerCategories}
          onConfirm={() => {
            setShowAssign(false);
            setToast("Se asigno al jugador a la nueva categoria.");
          }}
          onCancel={() => setShowAssign(false)}
        />
      )}
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-12">
      <h2 className="mb-4 font-heading text-xl font-bold text-text-primary">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function CodeRef({ component, path, props }: { component: string; path: string; props: string[] }) {
  return (
    <div className="mt-3 rounded-lg bg-brand-900 p-4 text-xs text-brand-200 font-mono overflow-x-auto">
      <p className="text-brand-500">// Import</p>
      <p>{`import { ${component} } from "${path}";`}</p>
      <p className="mt-2 text-brand-500">// Props</p>
      {props.map((p) => (
        <p key={p}>{p}</p>
      ))}
    </div>
  );
}
