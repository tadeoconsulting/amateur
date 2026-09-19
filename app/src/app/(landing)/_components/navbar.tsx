"use client";

import { useState } from "react";

export function Navbar({ onOpenAuth }: { onOpenAuth: (view: "login" | "register") => void }) {
  const [menuOpen, setMenuOpen] = useState(false);

  function handleAuth(view: "login" | "register") {
    onOpenAuth(view);
    setMenuOpen(false);
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-surface-primary/80 backdrop-blur-md border-b border-brand-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <a href="/" className="font-heading text-2xl font-bold tracking-tight text-text-primary">
            Amateur
          </a>

          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors">
              Características
            </a>
            <a href="#como-funciona" className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors">
              Cómo funciona
            </a>
            <a href="#numeros" className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors">
              Números
            </a>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={() => handleAuth("login")}
              className="text-sm font-medium text-text-primary hover:text-text-secondary transition-colors px-4 py-2 cursor-pointer"
            >
              Iniciar sesión
            </button>
            <button
              onClick={() => handleAuth("register")}
              className="text-sm font-bold bg-field-green text-surface-secondary px-5 py-2.5 rounded-full hover:bg-field-dark transition-colors cursor-pointer"
            >
              Crear torneo gratis
            </button>
          </div>

          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2 text-text-primary cursor-pointer"
            aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {menuOpen ? (
                <>
                  <line x1="6" y1="6" x2="18" y2="18" />
                  <line x1="6" y1="18" x2="18" y2="6" />
                </>
              ) : (
                <>
                  <line x1="3" y1="7" x2="21" y2="7" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="17" x2="21" y2="17" />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden border-t border-brand-200 bg-surface-primary/95 backdrop-blur-md">
          <div className="px-4 py-4 flex flex-col gap-3">
            <a href="#features" onClick={() => setMenuOpen(false)} className="text-sm font-medium text-text-secondary py-2">
              Características
            </a>
            <a href="#como-funciona" onClick={() => setMenuOpen(false)} className="text-sm font-medium text-text-secondary py-2">
              Cómo funciona
            </a>
            <a href="#numeros" onClick={() => setMenuOpen(false)} className="text-sm font-medium text-text-secondary py-2">
              Números
            </a>
            <hr className="border-brand-200" />
            <button onClick={() => handleAuth("login")} className="text-sm font-medium text-text-primary py-2 text-left cursor-pointer">
              Iniciar sesión
            </button>
            <button
              onClick={() => handleAuth("register")}
              className="text-sm font-bold bg-field-green text-surface-secondary px-5 py-3 rounded-full text-center hover:bg-field-dark transition-colors cursor-pointer"
            >
              Crear torneo gratis
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
