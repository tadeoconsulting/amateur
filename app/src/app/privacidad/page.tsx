"use client";

import { MobileShell } from "@/_components/mobile-shell";
import { BackHeader } from "@/_components/back-header";

export default function PrivacidadPage() {
  return (
    <MobileShell>
      <BackHeader />
      <section className="px-4 pt-4 pb-10">
        <h1 className="font-heading text-xl font-bold text-text-primary">
          Politicas de privacidad
        </h1>

        <div className="mt-6 space-y-4 font-body text-sm leading-relaxed text-text-secondary">
          <p>
            En Amateur nos comprometemos a proteger la privacidad de nuestros usuarios.
            Esta politica describe como recopilamos, usamos y protegemos tu informacion
            personal.
          </p>
          <p>
            <strong className="text-text-primary">1. Informacion que recopilamos.</strong>{" "}
            Recopilamos los datos que proporcionas al crear tu cuenta (nombre, correo
            electronico), la informacion de perfil de jugador o club, y los datos
            generados por el uso de la plataforma (resultados, estadisticas, actividad).
          </p>
          <p>
            <strong className="text-text-primary">2. Uso de la informacion.</strong>{" "}
            Utilizamos tus datos para operar la plataforma, gestionar torneos, generar
            estadisticas, enviar notificaciones relevantes y mejorar la experiencia del
            usuario.
          </p>
          <p>
            <strong className="text-text-primary">3. Datos de menores de edad.</strong>{" "}
            Si sos menor de edad, tu participacion en la plataforma requiere el
            consentimiento de tu padre, madre o tutor legal. Los organizadores y duenos
            de club son responsables de verificar dicho consentimiento antes de registrar
            jugadores menores.
          </p>
          <p>
            <strong className="text-text-primary">4. Compartir informacion.</strong>{" "}
            No vendemos ni compartimos tu informacion personal con terceros, excepto
            cuando sea necesario para el funcionamiento de la plataforma (ej: mostrar
            plantilla de un equipo a otros usuarios del torneo) o por requerimiento
            legal.
          </p>
          <p>
            <strong className="text-text-primary">5. Seguridad.</strong>{" "}
            Implementamos medidas de seguridad tecnicas y organizativas para proteger
            tus datos contra acceso no autorizado, perdida o alteracion.
          </p>
          <p>
            <strong className="text-text-primary">6. Retencion de datos.</strong>{" "}
            Conservamos tus datos mientras tu cuenta este activa. Podes solicitar la
            eliminacion de tu cuenta y datos asociados en cualquier momento contactando
            a nuestro equipo de soporte.
          </p>
          <p>
            <strong className="text-text-primary">7. Cambios en esta politica.</strong>{" "}
            Podemos actualizar esta politica periodicamente. Te notificaremos sobre
            cambios significativos a traves de la plataforma o por correo electronico.
          </p>
        </div>
      </section>
    </MobileShell>
  );
}
