"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { BackHeader } from "@/_components/back-header";
import { useApi } from "@/_lib/use-api";
import { useAuth } from "@/lib/auth-context";

type Preview = {
  kind: "link" | "email";
  club: { id: string; name: string; shortName: string; color: string | null; logoUrl: string | null };
  /** Solo en invitaciones personales: el correo al que iba dirigida. */
  email?: string;
};

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
  "Amazonas",
  "Áncash",
  "Apurímac",
  "Arequipa",
  "Ayacucho",
  "Cajamarca",
  "Cusco",
  "Huancavelica",
  "Huánuco",
  "Ica",
  "Junín",
  "La Libertad",
  "Lambayeque",
  "Lima",
  "Loreto",
  "Madre de Dios",
  "Moquegua",
  "Pasco",
  "Piura",
  "Puno",
  "San Martín",
  "Tacna",
  "Tumbes",
  "Ucayali",
];

type BottomSheetType = "posicion" | "departamento" | null;

function InvitacionContent() {
  const router = useRouter();
  const token = useSearchParams().get("token");
  const { user, loading: loadingAuth, refresh } = useAuth();
  const [step, setStep] = useState<"form" | "success">("form");

  // Qué club invita: se pregunta a la API con el token del link.
  const { data: preview, loading: loadingPreview, error: previewError } = useApi<Preview>(() =>
    token
      ? fetch(`/api/invitations/${token}`).then(async (r) => {
          if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? "La invitación no es válida");
          return r.json();
        })
      : Promise.reject(new Error("Falta el link de invitación"))
  );
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState<{ id: string; name: string } | null>(null);

  const [nombre, setNombre] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [dni, setDni] = useState("");
  const [posicion, setPosicion] = useState("");
  const [dia, setDia] = useState("");
  const [mes, setMes] = useState("");
  const [anio, setAnio] = useState("");
  const [sexo, setSexo] = useState<"masculino" | "femenino" | null>(null);
  const [telefono, setTelefono] = useState("");
  const [correo, setCorreo] = useState("");
  const [departamento, setDepartamento] = useState("");
  const [sheet, setSheet] = useState<BottomSheetType>(null);

  const clubName = preview?.club.name ?? "";
  // En una invitación personal el correo ya viene definido y no se cambia.
  const correoFinal = preview?.kind === "email" && preview.email ? preview.email : correo;

  const isFormValid =
    nombre && apellidos && dni && posicion && dia && mes && anio && sexo && telefono && correoFinal && departamento && password.length >= 8;

  // Alguien con cuenta y sesión no llena el formulario: solo acepta.
  async function accept(replace = false) {
    if (saving) return;
    setError("");
    setSaving(true);
    try {
      const res = await fetch(`/api/invitations/${token}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ replace }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 409 && data.currentClub) {
        setConflict(data.currentClub);
        return;
      }
      if (!res.ok) {
        setError(data.error ?? "No se pudo aceptar la invitación");
        return;
      }
      setConflict(null);
      await refresh();
      setStep("success");
    } catch {
      setError("No se pudo conectar. Inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  // Alguien sin cuenta la crea con el token y entra al club en el mismo paso.
  async function handleCreate() {
    if (!isFormValid || saving) return;
    const birthDate = `${anio.padStart(4, "0")}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`;
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: correoFinal,
          password,
          firstName: nombre,
          lastName: apellidos,
          dni,
          phone: telefono,
          gender: sexo,
          department: departamento,
          birthDate,
          position: posicion,
          clubToken: token,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "No se pudo crear el perfil");
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

  if (loadingPreview || loadingAuth) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-surface-primary">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  // Link inválido, revocado, vencido o ya usado.
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

  // Con sesión iniciada: confirmar y listo.
  if (user && step === "form") {
    return (
      <div className="flex min-h-dvh flex-col bg-surface-primary">
        <div className="mx-auto flex w-full max-w-[430px] flex-1 flex-col items-center justify-center px-6 text-center">
          <div
            className="mb-6 flex h-20 w-20 items-center justify-center rounded-full font-heading text-lg font-bold text-white"
            style={{ backgroundColor: preview.club.color ?? "#8B2D2D" }}
          >
            {preview.club.shortName.slice(0, 3).toUpperCase()}
          </div>
          <h1 className="font-heading text-xl font-bold text-text-primary">Te invitaron a unirte a {clubName}</h1>
          <p className="mt-3 text-sm text-text-secondary">
            Entrarás como {user.firstName} {user.lastName}.
          </p>

          {conflict && (
            <div className="mt-5 rounded-xl bg-btn-regular px-4 py-3 text-sm text-text-primary">
              Ya perteneces a <span className="font-semibold">{conflict.name}</span>. Si aceptas, dejarás ese equipo y
              perderás tu categoría y dorsal.
            </div>
          )}
          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

          <button
            onClick={() => accept(conflict !== null)}
            disabled={saving}
            className="mt-6 w-full cursor-pointer rounded-xl bg-brand-900 py-3.5 font-heading text-sm font-semibold text-text-invert disabled:opacity-50"
          >
            {saving ? "Uniéndome..." : conflict ? `Cambiarme a ${clubName}` : `Unirme a ${clubName}`}
          </button>
          <Link href="/jugador/equipos" className="mt-4 text-sm font-medium text-text-primary underline">
            Ahora no
          </Link>
        </div>
      </div>
    );
  }

  if (step === "success") {
    return (
      <div className="flex min-h-dvh flex-col bg-surface-primary">
        <div className="mx-auto flex w-full max-w-[430px] flex-1 flex-col items-center justify-center px-6 text-center">
          <div className="mb-6 text-8xl">🎉</div>
          <h1 className="font-heading text-2xl font-bold text-text-primary">
            ¡Bienvenido!
          </h1>
          <p className="mt-3 text-sm text-text-secondary">
            Ya eres parte de {clubName} y de nuestra comunidad futbolera.
          </p>
          <button
            onClick={() => router.push("/jugador/equipos")}
            className="mt-8 w-full cursor-pointer rounded-xl bg-brand-900 py-3.5 font-heading text-sm font-semibold text-text-invert"
          >
            Continuar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-surface-primary">
      <div className="mx-auto w-full max-w-[430px] flex-1">
        <BackHeader />

        {/* Club banner */}
        <div className="px-4 py-6" style={{ backgroundColor: preview.club.color ?? "#8B2D2D" }}>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2 border-white bg-white">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-brand-400">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
              <path d="M12 8v4l3 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        <div className="px-4 pt-6 pb-8">
          <h1 className="font-heading text-xl font-bold text-text-primary">
            ¡Bienvenido! ingresa tus datos para unirte al {clubName}
          </h1>

          <div className="mt-6 space-y-5">
            {/* Nombre completo */}
            <div>
              <label className="text-sm text-text-secondary">Nombre completo</label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Joe Doe"
                className="mt-1 w-full border-b border-brand-200 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:border-brand-900 focus:outline-none"
              />
            </div>

            {/* Apellidos */}
            <div>
              <label className="text-sm text-text-secondary">Apellidos</label>
              <input
                type="text"
                value={apellidos}
                onChange={(e) => setApellidos(e.target.value)}
                placeholder="Joe Doe"
                className="mt-1 w-full border-b border-brand-200 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:border-brand-900 focus:outline-none"
              />
            </div>

            {/* DNI */}
            <div>
              <label className="text-sm text-text-secondary">DNI</label>
              <input
                type="text"
                value={dni}
                onChange={(e) => setDni(e.target.value)}
                placeholder="12345678"
                className="mt-1 w-full border-b border-brand-200 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:border-brand-900 focus:outline-none"
              />
            </div>

            {/* Posición */}
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

            {/* Fecha de nacimiento */}
            <div>
              <label className="text-sm text-text-secondary">Fecha de nacimiento</label>
              <div className="mt-1 flex gap-3">
                <input
                  type="text"
                  value={dia}
                  onChange={(e) => setDia(e.target.value)}
                  placeholder="Día"
                  maxLength={2}
                  className="w-full rounded-lg border border-brand-200 px-3 py-2.5 text-center text-sm text-text-primary placeholder:text-text-secondary focus:border-brand-900 focus:outline-none"
                />
                <input
                  type="text"
                  value={mes}
                  onChange={(e) => setMes(e.target.value)}
                  placeholder="Mes"
                  maxLength={2}
                  className="w-full rounded-lg border border-brand-200 px-3 py-2.5 text-center text-sm text-text-primary placeholder:text-text-secondary focus:border-brand-900 focus:outline-none"
                />
                <input
                  type="text"
                  value={anio}
                  onChange={(e) => setAnio(e.target.value)}
                  placeholder="Año"
                  maxLength={4}
                  className="w-full rounded-lg border border-brand-200 px-3 py-2.5 text-center text-sm text-text-primary placeholder:text-text-secondary focus:border-brand-900 focus:outline-none"
                />
              </div>
            </div>

            {/* Sexo */}
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

            {/* Teléfono */}
            <div>
              <label className="text-sm text-text-secondary">Teléfono</label>
              <input
                type="tel"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="999 777 888"
                className="mt-1 w-full border-b border-brand-200 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:border-brand-900 focus:outline-none"
              />
            </div>

            {/* Correo */}
            <div>
              <label className="text-sm text-text-secondary">Correo</label>
              <input
                type="email"
                value={correoFinal}
                onChange={(e) => setCorreo(e.target.value)}
                readOnly={preview.kind === "email"}
                placeholder="joe@gmail.com"
                className="mt-1 w-full border-b border-brand-200 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:border-brand-900 focus:outline-none"
              />
            </div>

            {/* Contraseña */}
            <div>
              <label className="text-sm text-text-secondary">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                minLength={8}
                maxLength={72}
                autoComplete="new-password"
                className="mt-1 w-full border-b border-brand-200 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:border-brand-900 focus:outline-none"
              />
            </div>

            {/* Departamento */}
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
              onClick={handleCreate}
              disabled={!isFormValid || saving}
              className="w-full cursor-pointer rounded-xl bg-brand-900 py-3.5 font-heading text-sm font-semibold text-text-invert disabled:opacity-50"
            >
              {saving ? "Creando perfil..." : "Crear perfil"}
            </button>
            {error && <p className="text-center text-sm text-red-600">{error}</p>}
            <p className="text-center text-xs text-text-secondary">
              ¿Ya tienes cuenta?{" "}
              <Link
                href={`/?auth=login&next=${encodeURIComponent(`/jugador/invitacion?token=${token}`)}`}
                className="font-semibold text-text-primary underline"
              >
                Inicia sesión
              </Link>
            </p>

            <button
              onClick={() => router.back()}
              className="w-full cursor-pointer py-2 text-center text-sm font-medium text-text-primary"
            >
              Cancelar
            </button>
          </div>
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

export default function InvitacionPage() {
  return (
    <Suspense fallback={null}>
      <InvitacionContent />
    </Suspense>
  );
}
