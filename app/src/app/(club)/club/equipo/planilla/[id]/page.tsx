"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { BackHeader } from "@/_components/back-header";
import { Toast } from "@/_components/toast";
import { getClubStaff } from "@/_lib/api";
import { useApi } from "@/_lib/use-api";
import type { StaffRole } from "@/_lib/types";

const roleOptions: { key: StaffRole; label: string }[] = [
  { key: "delegado", label: "Delegado" },
  { key: "asistente", label: "Asistente" },
  { key: "director_tecnico", label: "Director técnico" },
];

export default function EditStaffPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data: staffMembers, loading } = useApi(() => getClubStaff("club-1"));
  const member = staffMembers?.find((s) => s.id === params.id) ?? null;

  const [name, setName] = useState("");
  const [role, setRole] = useState<StaffRole>("delegado");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [showRoleSheet, setShowRoleSheet] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (member) {
      setName(`${member.firstName} ${member.lastName}`);
      setRole((member.role as StaffRole) ?? "delegado");
      setPhone(member.phone ?? "");
      setEmail(member.email ?? "");
    }
  }, [member]);

  if (loading || !staffMembers) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  if (!member) {
    return (
      <div className="w-full py-20 text-center text-text-secondary">
        Miembro no encontrado
      </div>
    );
  }

  const roleLabel = roleOptions.find((r) => r.key === role)?.label ?? "";

  const handleSave = () => {
    setToast("Datos guardados con éxito.");
  };

  const handleDelete = () => {
    setShowDeleteDialog(false);
    setToast("Cuenta eliminada con éxito.");
    setTimeout(() => router.push("/club/equipo"), 1200);
  };

  return (
    <div className="w-full">
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}

      <BackHeader label="Volver al listado de equipos" />

      <div className="flex flex-col items-center px-4">
        {/* Avatar */}
        <div className="relative mt-4">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-brand-900">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" className="text-white">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-[#FF6B35]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-white">
              <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2zM12 17a4 4 0 100-8 4 4 0 000 8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="mt-6 space-y-5 px-4">
        <div>
          <label className="text-sm text-text-secondary">Nombre completo</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full border-b border-brand-200 py-2 text-sm text-text-primary focus:border-brand-900 focus:outline-none"
          />
        </div>

        <div>
          <label className="text-sm text-text-secondary">Elige el ajustes</label>
          <button
            onClick={() => setShowRoleSheet(true)}
            className="mt-1 flex w-full cursor-pointer items-center justify-between border-b border-brand-200 py-2"
          >
            <span className="text-sm text-text-primary">{roleLabel}</span>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-text-secondary">
              <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        <div>
          <label className="text-sm text-text-secondary">Número del delegado</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="mt-1 w-full border-b border-brand-200 py-2 text-sm text-text-primary focus:border-brand-900 focus:outline-none"
          />
        </div>

        <div>
          <label className="text-sm text-text-secondary">Correo del delegado</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full border-b border-brand-200 py-2 text-sm text-text-primary focus:border-brand-900 focus:outline-none"
          />
        </div>

        <button
          onClick={handleSave}
          className="w-full cursor-pointer rounded-xl bg-brand-900 py-3.5 font-heading text-sm font-semibold text-text-invert"
        >
          Guardar datos
        </button>

        <button
          onClick={() => setShowDeleteDialog(true)}
          className="w-full cursor-pointer py-2 text-center text-sm font-medium text-text-primary underline"
        >
          Eliminar cuenta
        </button>
      </div>

      {/* Role Bottom Sheet */}
      {showRoleSheet && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
          onClick={() => setShowRoleSheet(false)}
        >
          <div
            className="w-full max-w-[430px] rounded-t-2xl bg-white px-4 pb-8 pt-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-heading text-lg font-bold text-text-primary">
              Elige el ajustes del usuario
            </h3>
            <div className="mt-4 space-y-1">
              {roleOptions.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => {
                    setRole(opt.key);
                    setShowRoleSheet(false);
                  }}
                  className="w-full cursor-pointer py-3 text-left text-sm text-text-primary hover:bg-brand-100"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
          onClick={() => setShowDeleteDialog(false)}
        >
          <div
            className="w-full max-w-[430px] rounded-t-2xl bg-white px-4 pb-8 pt-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-heading text-lg font-bold text-text-primary">
              ¿Estás seguro de eliminar la cuenta de {member.firstName} {member.lastName}?
            </h3>
            <p className="mt-2 text-sm text-text-secondary">
              Si eliminas esta cuenta, ya no podrás recuperarla, tus datos personales serán borrados de nuestra base de datos.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowDeleteDialog(false)}
                className="flex-1 cursor-pointer rounded-xl border border-brand-900 py-3 text-center font-heading text-sm font-semibold text-text-primary"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 cursor-pointer rounded-xl bg-brand-900 py-3 text-center font-heading text-sm font-semibold text-text-invert"
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
