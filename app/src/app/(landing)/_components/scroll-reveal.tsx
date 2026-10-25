"use client";

import { useEffect, useRef, type ReactNode } from "react";

export function ScrollReveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      el.style.opacity = "1";
      el.style.transform = "none";
      return;
    }

    el.style.opacity = "0";
    el.style.transform = "translateY(20px)";
    el.style.transition = `opacity 0.5s ease-out ${delay}ms, transform 0.5s ease-out ${delay}ms`;

    let revealed = false;
    const reveal = () => {
      if (revealed) return;
      revealed = true;
      el.style.opacity = "1";
      el.style.transform = "none";
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
    };

    // El observador solo avisa cuando el bloque ENTRA a la pantalla: si la persona salta de golpe más allá de él (un enlace
    // del menú, un salto rápido con el dedo, recargar a mitad de la página), nunca entra y se quedaría invisible para
    // siempre. Por eso, además, se muestra todo bloque que ya quedó arriba o dentro de la pantalla.
    const alreadyPassed = () => el.getBoundingClientRect().top < window.innerHeight - 40;
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (alreadyPassed()) reveal();
      });
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) reveal();
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );

    observer.observe(el);
    window.addEventListener("scroll", onScroll, { passive: true });
    // Al cargar ya a mitad de la página (el navegador recuerda dónde estabas): lo que quedó arriba se muestra de una vez.
    if (el.getBoundingClientRect().bottom < 0) {
      el.style.transition = "none";
      reveal();
    }
    return () => {
      revealed = true;
      if (frame) cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, [delay]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
