import { redirect } from "next/navigation";

// El registro vive en el modal de la landing. El onboarding enlaza a /registro.
export default function RegistroPage() {
  redirect("/?auth=register");
}
