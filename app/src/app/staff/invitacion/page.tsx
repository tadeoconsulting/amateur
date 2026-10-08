"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useApi } from "@/_lib/use-api";
import { useAuth } from "@/lib/auth-context";
import { ClubCrest } from "@/_components/club-crest";

type Preview = {
  club: { id: string; name: string; shortName: string; color: string | null; logoUrl: string | null };
  role: string;
  email: string;
};

const roleLabels: Record<string, string> = {
  delegado: "Delegado",
  asistente: "Asistente",
  director_tecnico: "Director técnico",
};

function InvitacionStaffContent() {
  const token = useSearchParams().get("token");
  const { user, loading: loadingAuth, refresh } = useAuth();
  const [step, setStep] = useState<"form" | "success">("form");

  const { data: preview, loading: loadingPreview, error: previewError } = useApi<Preview>(() =>
    token
      ? fetch(`/api/staff-invitations/${token}`).then(async (r) => {
          if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? "La invitación no es válida");
          return r.json();
        })
      : Promise.reject(new Error("Falta el link de invitación"))
  );

  const [nombre, setNombre] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const clubName = preview?.club.name ?? "";
  const roleLabel = preview ? (roleLabels[preview.role] ?? preview.role) : "";
  const isFormValid = nombre.trim() && apellidos.trim() && password.length >= 8;

  async function accept() {
    if (saving) return;
    setError("");
    setSaving(true);
    try {
      const res = await fetch(`/api/staff-invitations/${token}/accept`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "No se pudo aceptar la invitación");
        return;
      }
      await refresh();
      setStep("success");
    } catch {
      setError("No se pudo conectar. Inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  // Sin cuenta todavía: se crea (sin elegir perfil, como cualquier alta por invitación) y
  // queda vinculada al club en el mismo paso.
  async function handleCreate() {
    if (!isFormValid || saving || !preview) return;
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: preview.email, password, firstName: nombre.trim(), lastName: apellidos.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "No se pudo crear la cuenta");
        return;
      }
      await refresh();
      await accept();
    } catch {
      setError("No se pudo conectar. Inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  if (loadingPreview || loadingAuth) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-surface-primary">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  if (!preview) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-surface-primary px-6 text-center">
        <h1 className="font-heading text-xl font-bold text-text-primary">Esta invitación no sirve</h1>
        <p className="max-w-[300px] text-sm text-text-secondary">
          {previewError ?? "La invitación no es válida"}. Pídele al club que te comparta un link nuevo.
        </p>
        <Link href="/" className="mt-2 font-heading text-sm font-semibold text-text-primary underline">
          Ir al inicio
        </Link>
      </div>
    );
  }

  if (step === "success") {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-surface-primary px-6 text-center">
        <h1 className="font-heading text-xl font-bold text-text-primary">Listo, ya eres parte de {clubName}</h1>
        <p className="max-w-[300px] text-sm text-text-secondary">Te sumaste como {roleLabel.toLowerCase()}.</p>
        <Link href="/" className="mt-2 font-heading text-sm font-semibold text-text-primary underline">
          Ir al inicio
        </Link>
      </div>
    );
  }

  // Con sesión iniciada: confirmar y listo, sin formulario.
  if (user) {
    return (
      <div className="flex min-h-dvh flex-col bg-surface-primary">
        <div className="mx-auto flex w-full max-w-[430px] flex-1 flex-col items-center justify-center px-6 text-center">
          <div className="mb-6">
            <ClubCrest club={preview.club} size="h-20 w-20" textSize="text-lg" />
          </div>
          <h1 className="font-heading text-xl font-bold text-text-primary">
            Te invitaron como {roleLabel.toLowerCase()} de {clubName}
          </h1>
          <p className="mt-3 text-sm text-text-secondary">
            Entrarás como {user.firstName} {user.lastName}.
          </p>

          {error && <p className="mt-4 font-body text-sm text-red-600">{error}</p>}

          <button
            onClick={accept}
            disabled={saving}
            className="mt-6 w-full cursor-pointer rounded-xl bg-brand-900 py-3.5 font-heading text-sm font-semibold text-text-invert disabled:opacity-50"
          >
            {saving ? "Uniéndote..." : `Unirme como ${roleLabel.toLowerCase()}`}
          </button>
        </div>
      </div>
    );
  }

  // Sin sesión: crea su cuenta (correo fijo, el de la invitación) y acepta en el mismo paso.
  return (
    <div className="flex min-h-dvh flex-col bg-surface-primary px-6 py-10">
      <div className="mx-auto w-full max-w-[380px]">
        <div className="mx-auto mb-6 w-fit">
          <ClubCrest club={preview.club} size="h-20 w-20" textSize="text-lg" />
        </div>
        <h1 className="text-center font-heading text-xl font-bold text-text-primary">
          Te invitaron como {roleLabel.toLowerCase()} de {clubName}
        </h1>
        <p className="mt-2 text-center text-sm text-text-secondary">Crea tu cuenta para aceptar.</p>

        <div className="mt-6 flex flex-col gap-3">
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Nombre"
            className="w-full rounded-lg bg-brand-100 px-4 py-3 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none"
          />
          <input
            type="text"
            value={apellidos}
            onChange={(e) => setApellidos(e.target.value)}
            placeholder="Apellidos"
            className="w-full rounded-lg bg-brand-100 px-4 py-3 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none"
          />
          <input
            type="email"
            value={preview.email}
            readOnly
            disabled
            className="w-full cursor-not-allowed rounded-lg bg-brand-100 px-4 py-3 text-sm text-text-secondary focus:outline-none"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Contraseña (mínimo 8 caracteres)"
            minLength={8}
            className="w-full rounded-lg bg-brand-100 px-4 py-3 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none"
          />

          {error && <p className="font-body text-sm text-red-600">{error}</p>}

          <button
            onClick={handleCreate}
            disabled={!isFormValid || saving}
            className="mt-2 w-full cursor-pointer rounded-xl bg-brand-900 py-3.5 font-heading text-sm font-semibold text-text-invert disabled:opacity-50"
          >
            {saving ? "Creando cuenta..." : "Crear cuenta y unirme"}
          </button>
        </div>

        <p className="mt-6 text-center text-sm text-text-secondary">
          ¿Ya tienes cuenta?{" "}
          <Link href={`/?auth=login&next=${encodeURIComponent(`/staff/invitacion?token=${token}`)}`} className="font-semibold text-text-primary underline">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function InvitacionStaffPage() {
  return (
    <Suspense fallback={null}>
      <InvitacionStaffContent />
    </Suspense>
  );
}
