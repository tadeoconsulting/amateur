import type { Metadata } from "next";
import { RestablecerForm } from "./restablecer-form";

export const metadata: Metadata = { title: "Restablecer contraseña" };

// Pública: la abre quien no puede entrar, desde el enlace del correo ("Olvidé mi contraseña").
export default async function RestablecerPage({ searchParams }: PageProps<"/restablecer">) {
  const { token } = await searchParams;
  return <RestablecerForm token={typeof token === "string" ? token : ""} />;
}
