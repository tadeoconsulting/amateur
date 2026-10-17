"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { btnOutline } from "@/_components/button-styles";
import { switchAccountPath, type SwitchAccountRole } from "@/_lib/switch-account";

/**
 * "¿No es tu cuenta?" para las páginas de invitación que exigen una cuenta (delegado de un equipo, perfil de
 * jugador). Quien abre el enlace con otra sesión ya iniciada en el navegador — su cuenta de organizador o de
 * administrador, o la de otra persona del mismo dispositivo — solo veía "Entraste como…" y "Aceptar", sin forma
 * de entrar con otra cuenta ni de crear la suya: nunca llegaba a poner una contraseña.
 *
 * Cada botón cierra la sesión actual y lleva al inicio de sesión o al registro, que vuelve a esta misma página
 * (`here`) al terminar. `registerRole` deja elegido el perfil en el registro.
 */
export function SwitchAccount({ here, registerRole }: { here: string; registerRole: SwitchAccountRole }) {
  const { logout } = useAuth();
  const [busy, setBusy] = useState(false);

  async function go(view: "login" | "register") {
    setBusy(true);
    await logout(switchAccountPath(view, here, registerRole));
  }

  return (
    <section className="mt-2 border-t border-border-primary pt-5" aria-labelledby="switch-account">
      <h2 id="switch-account" className="font-heading text-sm font-bold text-text-primary">
        ¿No es tu cuenta?
      </h2>
      <p className="mt-1 font-body text-xs text-text-secondary">
        Si la invitación es para otra persona, o para un correo que todavía no tiene cuenta, cierra esta sesión y entra o crea la tuya: al
        terminar vuelves a esta página.
      </p>
      <div className="mt-3 flex flex-col gap-2">
        <button type="button" onClick={() => void go("register")} disabled={busy} className={`${btnOutline} w-full`}>
          Crear una cuenta nueva
        </button>
        <button type="button" onClick={() => void go("login")} disabled={busy} className={`${btnOutline} w-full`}>
          Entrar con otra cuenta
        </button>
      </div>
    </section>
  );
}
