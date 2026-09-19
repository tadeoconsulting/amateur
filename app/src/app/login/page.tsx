"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { MobileShell } from "@/_components/mobile-shell";
import { BackHeader } from "@/_components/back-header";

export default function LoginPage() {
  const [email, setEmail] = useState("");

  return (
    <MobileShell>
      <BackHeader />

      {/* Content — pushed to bottom */}
      <div className="flex flex-1 flex-col items-start justify-end gap-6 px-4 pb-10">
        {/* Title */}
        <div className="flex flex-col gap-4">
          <h1 className="font-heading text-[22px] font-bold leading-[26px] text-text-primary">
            Bienvenid@
          </h1>
          <p className="font-body text-lg leading-6 text-text-primary">
            Inicia sesión o crea tu cuenta.
          </p>
        </div>

        {/* Auth options */}
        <div className="flex w-full flex-col gap-4">
          {/* Google button */}
          <button className="flex w-full items-center justify-center gap-2 rounded-md border border-border-primary bg-white px-4 py-[11px] transition-colors hover:bg-brand-300">
            <Image
              src="/google-icon.svg"
              alt=""
              width={24}
              height={24}
            />
            <span className="font-heading text-sm font-semibold tracking-[0.5px] text-text-primary">
              Continuar con Google
            </span>
          </button>

          {/* Divider */}
          <div className="flex items-center gap-2.5 py-1">
            <div className="h-px flex-1 bg-text-secondary opacity-50" />
            <span className="font-heading text-xs tracking-[0.24px] text-text-secondary">o</span>
            <div className="h-px flex-1 bg-text-secondary opacity-50" />
          </div>

          {/* Email form */}
          <div className="flex flex-col gap-3">
            <input
              type="email"
              placeholder="Ingresa tu correo"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded bg-btn-regular px-3 py-3 font-body text-sm text-text-primary placeholder:text-text-primary/60 focus:outline-none focus:ring-2 focus:ring-border-primary"
            />
            <button className="w-full rounded bg-btn-primary py-3 font-heading text-sm text-text-invert transition-colors hover:bg-btn-secondary">
              Continuar con email
            </button>
            <p className="text-xs leading-[18px] tracking-[0.24px] text-text-primary font-heading">
              Al continuar con un correo o una cuenta de google, tu estarás aceptando nuestros{" "}
              <Link href="/terminos" className="font-bold underline">
                Términos y condiciones
              </Link>{" "}
              y{" "}
              <Link href="/privacidad" className="font-bold underline">
                Política de privacidad
              </Link>
            </p>
          </div>
        </div>

        {/* Forgot password */}
        <Link
          href="/recuperar"
          className="w-full text-center font-heading text-sm font-semibold text-text-primary underline"
        >
          Olvidé mi contraseña
        </Link>
      </div>
    </MobileShell>
  );
}
