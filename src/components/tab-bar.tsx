"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type TabItem = {
  href: string;
  label: string;
  icon: ReactNode;
  exact?: boolean;
};

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const IconQuill = (
  <svg viewBox="0 0 24 24" className="h-5 w-5" {...stroke}>
    <path d="M4 20c6-1 10-5 14-14-4 1-9 3-11 6s-3 6-3 8Z" />
    <path d="M4 20l6-6" />
  </svg>
);
const IconLer = (
  <svg viewBox="0 0 24 24" className="h-5 w-5" {...stroke}>
    <circle cx="12" cy="12" r="9" />
    <path d="M10 8.5v7l6-3.5-6-3.5Z" fill="currentColor" stroke="none" />
  </svg>
);
const IconEstante = (
  <svg viewBox="0 0 24 24" className="h-5 w-5" {...stroke}>
    <rect x="4" y="3" width="4" height="18" rx="1" />
    <rect x="10" y="6" width="4" height="15" rx="1" />
    <rect x="16" y="3" width="4" height="18" rx="1" />
  </svg>
);
const IconJuntos = (
  <svg viewBox="0 0 24 24" className="h-5 w-5" {...stroke}>
    <circle cx="9" cy="9" r="3" />
    <circle cx="17" cy="11" r="2.5" />
    <path d="M3 20c.5-3 3-5 6-5s5.5 2 6 5" />
    <path d="M14 20c.3-2 2-3.5 4-3.5s3.5 1 4 3" />
  </svg>
);
const IconPerfil = (
  <svg viewBox="0 0 24 24" className="h-5 w-5" {...stroke}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c1-4 4-6 8-6s7 2 8 6" />
  </svg>
);

const TABS: TabItem[] = [
  { href: "/", label: "Quill", icon: IconQuill, exact: true },
  { href: "/ler", label: "Ler", icon: IconLer },
  { href: "/estante", label: "Estante", icon: IconEstante },
  { href: "/juntos", label: "Juntos", icon: IconJuntos },
  { href: "/profile", label: "Perfil", icon: IconPerfil },
];

export function TabBar() {
  const pathname = usePathname();

  return (
    // `fixed` e não item de flex: presa ao viewport, ela para de subir e descer
    // junto com a barra de endereço do navegador no celular. z-20 fica acima do
    // conteúdo (cabeçalhos sticky são z-10) e abaixo das folhas (z-30 pra cima),
    // que precisam cobri-la.
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-20 border-t-2 border-ink bg-paper pb-[max(env(safe-area-inset-bottom),0.5rem)]"
    >
      <ul className="mx-auto flex w-full max-w-[390px] items-stretch justify-between gap-1 px-2 py-1.5">
        {TABS.map((tab) => {
          const active = tab.exact
            ? pathname === tab.href
            : pathname === tab.href || pathname.startsWith(tab.href + "/");
          return (
            <li key={tab.href} className="flex-1 min-w-0">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={
                  active
                    ? "flex h-14 flex-col items-center justify-center gap-0.5 rounded-md border-2 border-ink bg-navy px-1 text-paper shadow-hard-sm"
                    : "flex h-14 flex-col items-center justify-center gap-0.5 rounded-md border-2 border-transparent px-1 text-ink-soft"
                }
              >
                {tab.icon}
                <span className="text-[10px] font-semibold tracking-wide leading-none">
                  {tab.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
