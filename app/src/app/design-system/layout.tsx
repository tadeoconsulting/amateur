"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navSections = [
  {
    title: "Foundations",
    items: [
      { label: "Overview", href: "/design-system" },
      { label: "Color", href: "/design-system/color" },
      { label: "Typography", href: "/design-system/typography" },
      { label: "Tokens", href: "/design-system/tokens" },
    ],
  },
  {
    title: "Components",
    items: [
      { label: "Buttons", href: "/design-system/buttons" },
      { label: "Inputs y selection", href: "/design-system/inputs" },
      { label: "Accordion", href: "/design-system/accordion" },
      { label: "Navigation", href: "/design-system/navigation" },
      { label: "Tournament", href: "/design-system/tournament" },
      { label: "Players", href: "/design-system/players" },
    ],
  },
];

export default function DesignSystemLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-dvh bg-surface-primary">
      {/* Mobile header */}
      <header className="fixed top-0 right-0 left-0 z-40 flex items-center gap-3 border-b border-brand-200 bg-surface-secondary px-4 py-3 lg:hidden">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="text-text-invert"
          aria-label="Toggle menu"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
        <span className="font-heading text-sm font-semibold tracking-wide text-text-invert">
          Crono DS
        </span>
      </header>

      {/* Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-[260px] overflow-y-auto bg-surface-secondary transition-transform lg:sticky lg:z-0 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="px-5 pt-6 pb-2">
          <Link
            href="/design-system"
            className="block font-heading text-lg font-bold text-text-invert"
            onClick={() => setSidebarOpen(false)}
          >
            Crono <span className="font-normal text-brand-500">DS</span>
          </Link>
          <p className="mt-0.5 text-xs text-brand-500">Design System</p>
        </div>

        <nav className="mt-4 px-3 pb-8">
          {navSections.map((section) => (
            <div key={section.title} className="mb-6">
              <h3 className="mb-2 px-2 text-[11px] font-semibold tracking-[0.08em] text-brand-500 uppercase">
                {section.title}
              </h3>
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const active = pathname === item.href;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setSidebarOpen(false)}
                        className={`block rounded-md px-2 py-1.5 text-sm transition-colors ${
                          active
                            ? "bg-brand-700 font-medium text-text-invert"
                            : "text-brand-200 hover:bg-brand-700/50 hover:text-text-invert"
                        }`}
                      >
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-brand-700 px-5 py-4">
          <Link href="/dev" className="text-xs text-brand-500 hover:text-brand-200">
            ← Dev Glossary
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="min-w-0 flex-1 pt-[52px] lg:pt-0">
        <div className="mx-auto max-w-3xl px-6 py-10 lg:px-12 lg:py-16">
          {children}
        </div>
      </main>
    </div>
  );
}
