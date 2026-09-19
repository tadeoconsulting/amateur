"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BackHeader } from "@/_components/back-header";
import { getClubStaff } from "@/_lib/api";
import { useApi } from "@/_lib/use-api";
import { Toast } from "@/_components/toast";

type Gender = "femenino" | "masculino" | "mixto";
type CategoryType = "definir_edad" | "libre" | "master";

const genderOptions: { key: Gender; label: string }[] = [
  { key: "femenino", label: "Femenino" },
  { key: "masculino", label: "Masculino" },
  { key: "mixto", label: "Mixto" },
];

const categoryOptions: { key: CategoryType; label: string }[] = [
  { key: "definir_edad", label: "Definir edad" },
  { key: "libre", label: "Libre" },
  { key: "master", label: "Master" },
];

export default function CrearCategoriaPage() {
  const router = useRouter();
  const { data: staffMembers, loading: loadingStaff } = useApi(() => getClubStaff("club-1"));
  const dtStaff = (staffMembers ?? []).filter((s) => s.role === "director_tecnico");
  const [gender, setGender] = useState<Gender | null>(null);
  const [category, setCategory] = useState<CategoryType | null>(null);
  const [age, setAge] = useState("");
  const [selectedDt, setSelectedDt] = useState<string | null>(null);
  const [showDtSheet, setShowDtSheet] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const ageLabel =
    category === "definir_edad"
      ? "Definir la edad máxima de los jugadores"
      : "Definir la edad mínima de los jugadores";

  const showAgeField = category !== null;

  const selectedDtMember = dtStaff.find((s) => s.id === selectedDt);

  const handleCreate = () => {
    setToast("Categoría creada con éxito.");
    setTimeout(() => router.push("/club/equipo"), 1200);
  };

  return (
    <div className="w-full">
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}

      <BackHeader />

      <div className="space-y-6 px-4">
        {/* Gender */}
        <div>
          <p className="text-sm text-text-secondary">Elige el género</p>
          <div className="mt-2 flex gap-2">
            {genderOptions.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setGender(opt.key)}
                className={`flex-1 cursor-pointer rounded-lg py-3 text-center text-sm font-medium transition-colors ${
                  gender === opt.key
                    ? "bg-surface-secondary text-text-invert"
                    : "border border-border-primary text-text-primary"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Category type */}
        <div>
          <p className="text-sm text-text-secondary">Elige una categoría</p>
          <div className="mt-2 flex gap-2">
            {categoryOptions.map((opt) => (
              <button
                key={opt.key}
                onClick={() => {
                  setCategory(opt.key);
                  if (opt.key === "definir_edad") setAge("25");
                  else if (opt.key === "libre") setAge("10");
                  else setAge("5");
                }}
                className={`flex-1 cursor-pointer rounded-lg py-3 text-center text-sm font-medium transition-colors ${
                  category === opt.key
                    ? "bg-surface-secondary text-text-invert"
                    : "border border-border-primary text-text-primary"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Age field */}
        {showAgeField && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-text-primary">{ageLabel}</p>
            <input
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              className="w-16 rounded-lg border border-brand-200 py-2 text-center text-sm text-text-primary focus:border-brand-900 focus:outline-none"
            />
          </div>
        )}

        {/* DT selector */}
        <div>
          <p className="text-sm text-text-secondary">Elige el DT</p>
          <button
            onClick={() => setShowDtSheet(true)}
            className="mt-2 flex w-full cursor-pointer items-center justify-between rounded-lg border border-brand-200 px-4 py-3"
          >
            <span className={`text-sm ${selectedDtMember ? "text-text-primary" : "text-text-secondary"}`}>
              {selectedDtMember
                ? `${selectedDtMember.firstName} ${selectedDtMember.lastName}`
                : "Selecciona un DT"}
            </span>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-text-secondary">
              <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {/* Create button */}
        <button
          onClick={handleCreate}
          className="w-full cursor-pointer rounded-xl bg-brand-900 py-3.5 font-heading text-sm font-semibold text-text-invert"
        >
          Crear categoría
        </button>
      </div>

      {/* DT Bottom Sheet */}
      {showDtSheet && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
          onClick={() => setShowDtSheet(false)}
        >
          <div
            className="w-full max-w-[430px] rounded-t-2xl bg-white px-4 pb-8 pt-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-lg font-bold text-text-primary">Elige un DT</h3>
              <button onClick={() => setShowDtSheet(false)} className="cursor-pointer text-text-primary">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="mt-4 space-y-1">
              {dtStaff.map((dt) => (
                <button
                  key={dt.id}
                  onClick={() => {
                    setSelectedDt(dt.id);
                    setShowDtSheet(false);
                  }}
                  className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-2 py-3 hover:bg-brand-100"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-300 text-sm font-semibold text-text-secondary">
                    {dt.firstName[0]}{dt.lastName[0]}
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <span className="font-heading font-bold text-text-primary">
                      {dt.firstName} {dt.lastName}
                    </span>
                    <p className="text-sm text-text-secondary">
                      Director técnico
                    </p>
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                setShowDtSheet(false);
                router.push("/club/equipo/buscar-delegado");
              }}
              className="mt-4 w-full cursor-pointer text-center text-sm font-medium text-text-primary underline"
            >
              Agregar un DT
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
