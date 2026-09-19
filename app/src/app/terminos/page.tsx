"use client";

import { MobileShell } from "@/_components/mobile-shell";
import { BackHeader } from "@/_components/back-header";

export default function TerminosPage() {
  return (
    <MobileShell>
      <BackHeader />
      <section className="px-4 pt-4 pb-10">
        <h1 className="font-heading text-xl font-bold text-text-primary">
          Terminos y condiciones
        </h1>

        <div className="mt-6 space-y-4 font-body text-sm leading-relaxed text-text-secondary">
          <p>
            Bienvenido a Amateur. Al acceder y utilizar nuestra plataforma, aceptas los
            siguientes terminos y condiciones. Te pedimos que los leas con atencion antes
            de continuar.
          </p>
          <p>
            <strong className="text-text-primary">1. Uso de la plataforma.</strong>{" "}
            Amateur es una herramienta de gestion para torneos de futbol amateur. Los
            organizadores pueden crear torneos, registrar equipos, gestionar calendarios
            y publicar resultados en tiempo real. Los usuarios se comprometen a utilizar
            la plataforma unicamente para los fines previstos.
          </p>
          <p>
            <strong className="text-text-primary">2. Registro y cuentas.</strong>{" "}
            Para acceder a las funcionalidades de la plataforma es necesario crear una
            cuenta. Los datos proporcionados deben ser veraces y actualizados. El usuario
            es responsable de mantener la confidencialidad de sus credenciales de acceso.
          </p>
          <p>
            <strong className="text-text-primary">3. Roles y responsabilidades.</strong>{" "}
            La plataforma contempla distintos roles: organizador, dueno de club y
            jugador. Cada rol tiene permisos especificos. Los organizadores son
            responsables de la veracidad de los datos de sus torneos.
          </p>
          <p>
            <strong className="text-text-primary">4. Datos de menores.</strong>{" "}
            Cuando se registren jugadores menores de edad, el organizador y/o el dueno
            del club asumen la responsabilidad de contar con el consentimiento de los
            tutores legales para el tratamiento de sus datos personales.
          </p>
          <p>
            <strong className="text-text-primary">5. Propiedad intelectual.</strong>{" "}
            Todo el contenido, diseno y tecnologia de la plataforma es propiedad de
            Amateur. Queda prohibida la reproduccion total o parcial sin autorizacion
            previa por escrito.
          </p>
          <p>
            <strong className="text-text-primary">6. Modificaciones.</strong>{" "}
            Amateur se reserva el derecho de modificar estos terminos en cualquier
            momento. Las modificaciones seran notificadas a los usuarios registrados y
            entraran en vigencia desde su publicacion.
          </p>
          <p>
            <strong className="text-text-primary">7. Limitacion de responsabilidad.</strong>{" "}
            Amateur no se hace responsable por la suspension o cancelacion de torneos
            organizados a traves de la plataforma, ni por conflictos entre organizadores,
            clubes o jugadores.
          </p>
        </div>
      </section>
    </MobileShell>
  );
}
