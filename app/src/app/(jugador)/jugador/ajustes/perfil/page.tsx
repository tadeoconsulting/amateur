"use client";

import { useState } from "react";
import { BackHeader } from "@/_components/back-header";
import { Toast } from "@/_components/toast";

const positions = [
  "Portero",
  "Defensa central",
  "Lateral",
  "Libre",
  "Carrilero",
  "Pivote",
  "Media punta",
  "Volante",
  "Delantero centro",
  "Extremo",
];

const departamentos = [
  "Amazonas", "Áncash", "Apurímac", "Arequipa", "Ayacucho", "Cajamarca",
  "Cusco", "Huancavelica", "Huánuco", "Ica", "Junín", "La Libertad",
  "Lambayeque", "Lima", "Loreto", "Madre de Dios", "Moquegua", "Pasco",
  "Piura", "Puno", "San Martín", "Tacna", "Tumbes", "Ucayali",
];

type BottomSheetType = "posicion" | "departamento" | null;

export default function JugadorPerfilPage() {
  const [nombre, setNombre] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [posicion, setPosicion] = useState("");
  const [dia, setDia] = useState("");
  const [mes, setMes] = useState("");
  const [anio, setAnio] = useState("");
  const [sexo, setSexo] = useState<"masculino" | "femenino" | "">("");
  const [telefono, setTelefono] = useState("");
  const [departamento, setDepartamento] = useState("");
  const [sheet, setSheet] = useState<BottomSheetType>(null);
  const [toast, setToast] = useState<string | null>(null);

  const handleSave = () => {
    setToast("Perfil actualizado correctamente.");
  };

  return (
    <div className="w-full pb-8">
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}

      <BackHeader />

      <div className="px-4">
        <h2 className="font-heading text-lg font-bold text-text-primary">Perfil</h2>

        {/* Avatar */}
        <div className="mt-4 flex justify-center">
          <div className="relative">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-brand-200">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" className="text-text-secondary">
                <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" />
                <path d="M4 20c0-4 4-6 8-6s8 2 8 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <div className="absolute -bottom-1 right-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-brand-900">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-white">
                <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2zM12 17a4 4 0 100-8 4 4 0 000 8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="mt-6 space-y-5">
          <div>
            <label className="text-sm text-text-secondary">Nombre completo</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="mt-1 w-full border-b border-brand-200 py-2 text-sm text-text-primary focus:border-brand-900 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-sm text-text-secondary">Apellidos</label>
            <input
              type="text"
              value={apellidos}
              onChange={(e) => setApellidos(e.target.value)}
              className="mt-1 w-full border-b border-brand-200 py-2 text-sm text-text-primary focus:border-brand-900 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-sm text-text-secondary">Posición</label>
            <button
              onClick={() => setSheet("posicion")}
              className="mt-1 flex w-full cursor-pointer items-center justify-between border-b border-brand-200 py-2 text-sm"
            >
              <span className={posicion ? "text-text-primary" : "text-text-secondary"}>
                {posicion || "Elige una opción"}
              </span>
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none" className="text-text-secondary">
                <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>

          <div>
            <label className="text-sm text-text-secondary">Fecha de nacimiento</label>
            <div className="mt-1 flex gap-3">
              <input
                type="text"
                value={dia}
                onChange={(e) => setDia(e.target.value)}
                maxLength={2}
                className="w-full rounded-lg border border-brand-200 px-3 py-2.5 text-center text-sm text-text-primary focus:border-brand-900 focus:outline-none"
              />
              <input
                type="text"
                value={mes}
                onChange={(e) => setMes(e.target.value)}
                maxLength={2}
                className="w-full rounded-lg border border-brand-200 px-3 py-2.5 text-center text-sm text-text-primary focus:border-brand-900 focus:outline-none"
              />
              <input
                type="text"
                value={anio}
                onChange={(e) => setAnio(e.target.value)}
                maxLength={4}
                className="w-full rounded-lg border border-brand-200 px-3 py-2.5 text-center text-sm text-text-primary focus:border-brand-900 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-sm text-text-secondary">Sexo</label>
            <div className="mt-1 flex gap-2">
              {(["masculino", "femenino"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSexo(s)}
                  className={`flex-1 cursor-pointer rounded-lg py-2.5 text-center text-sm font-semibold transition-colors ${
                    sexo === s
                      ? "bg-surface-secondary text-text-invert"
                      : "border border-border-primary text-text-primary"
                  }`}
                >
                  {s === "masculino" ? "Masculino" : "Femenino"}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm text-text-secondary">Teléfono</label>
            <input
              type="tel"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              className="mt-1 w-full border-b border-brand-200 py-2 text-sm text-text-primary focus:border-brand-900 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-sm text-text-secondary">Departamento</label>
            <button
              onClick={() => setSheet("departamento")}
              className="mt-1 flex w-full cursor-pointer items-center justify-between border-b border-brand-200 py-2 text-sm"
            >
              <span className={departamento ? "text-text-primary" : "text-text-secondary"}>
                {departamento || "Elegir una ciudad"}
              </span>
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none" className="text-text-secondary">
                <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>

          <button
            onClick={handleSave}
            className="w-full cursor-pointer rounded-xl bg-brand-900 py-3.5 font-heading text-sm font-semibold text-text-invert"
          >
            Crear perfil
          </button>

          <button className="w-full cursor-pointer py-2 text-center text-sm font-medium text-text-primary">
            Cancelar
          </button>
        </div>
      </div>

      {/* Bottom Sheets */}
      {sheet && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
          onClick={() => setSheet(null)}
        >
          <div
            className="w-full max-w-[430px] rounded-t-2xl bg-white px-4 pb-8 pt-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-heading text-lg font-bold text-text-primary">
                {sheet === "posicion" ? "Elige una posición" : "Elige un departamento"}
              </h3>
              <button onClick={() => setSheet(null)} className="cursor-pointer p-1 text-text-primary">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <div className="max-h-[50vh] overflow-y-auto">
              {(sheet === "posicion" ? positions : departamentos).map((item) => (
                <button
                  key={item}
                  onClick={() => {
                    if (sheet === "posicion") setPosicion(item);
                    else setDepartamento(item);
                    setSheet(null);
                  }}
                  className="w-full cursor-pointer border-b border-brand-100 py-3 text-left text-sm text-text-primary last:border-0 hover:bg-brand-50"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
