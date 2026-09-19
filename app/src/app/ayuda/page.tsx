"use client";

import { useState } from "react";
import { MobileShell } from "@/_components/mobile-shell";
import { BackHeader } from "@/_components/back-header";
import { Accordion } from "@/_components/accordion";
import { CategoryTabs } from "@/_components/category-tabs";

const categories = ["General", "Torneos"];

const faqs: Record<string, { question: string; answer: string }[]> = {
  General: [
    {
      question: "Como creo mi cuenta?",
      answer:
        "Podes crear tu cuenta usando tu correo electronico o tu cuenta de Google desde la pantalla de inicio de sesion. Solo necesitas un email valido para comenzar.",
    },
    {
      question: "Puedo tener mas de un rol?",
      answer:
        "Si. Una misma cuenta puede ser organizador de torneos, dueno de club y jugador al mismo tiempo. El sistema adapta la experiencia segun el rol activo.",
    },
    {
      question: "Como recupero mi contrasena?",
      answer:
        "Desde la pantalla de login, toca Olvide mi contrasena e ingresa tu correo. Te enviaremos un enlace para restablecer tu clave.",
    },
  ],
  Torneos: [
    {
      question: "Como creo un torneo?",
      answer:
        "Desde el panel de organizador, toca Crear torneo. Completa nombre, formato (liga, eliminacion directa o grupos), fechas y categoria. Despues podes agregar equipos.",
    },
    {
      question: "Puedo editar un torneo en curso?",
      answer:
        "Podes modificar fechas de partidos y agregar resultados. El formato del torneo y la cantidad de equipos no se pueden cambiar una vez que arranco.",
    },
    {
      question: "Como cargo los resultados en vivo?",
      answer:
        "Durante un partido, entra al detalle del encuentro y usa los controles de eventos para registrar goles, tarjetas y otros incidentes. Los cambios se reflejan en tiempo real.",
    },
  ],
};

export default function AyudaPage() {
  const [activeCategory, setActiveCategory] = useState(categories[0]);

  return (
    <MobileShell>
      <BackHeader />
      <section className="px-4 pt-4">
        <h1 className="font-heading text-xl font-bold text-text-primary">
          Centro de ayuda
        </h1>
        <div className="mt-4">
          <CategoryTabs
            categories={categories}
            active={activeCategory}
            onChange={setActiveCategory}
          />
        </div>
        <div className="mt-6">
          <Accordion key={activeCategory} items={faqs[activeCategory]} defaultOpen={0} />
        </div>
      </section>
    </MobileShell>
  );
}
