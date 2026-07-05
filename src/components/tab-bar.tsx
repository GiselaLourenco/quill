"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Quill", icon: "home" },
  { href: "/ler", label: "Ler", icon: "play" },
  { href: "/estante", label: "Estante", icon: "books" },
  { href: "/juntos", label: "Juntos", icon: "juntos" },
];

function TabIcon({ icon, active }: { icon: string; active: boolean }) {
  const color = active ? "#0F6E56" : "#2C2C2A";
  if (icon === "home") {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M4 11.5 12 4l8 7.5V20a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z"
          stroke={color}
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (icon === "play") {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2" />
        <path d="M10 8.5v7l6-3.5z" fill={color} />
      </svg>
    );
  }
  if (icon === "books") {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="4" y="4" width="4.5" height="16" rx="1" stroke={color} strokeWidth="2" />
        <rect x="10" y="4" width="4.5" height="16" rx="1" stroke={color} strokeWidth="2" />
        <rect
          x="15.7"
          y="5.3"
          width="4.5"
          height="16"
          rx="1"
          stroke={color}
          strokeWidth="2"
          transform="rotate(12 18 13)"
        />
      </svg>
    );
  }
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" strokeWidth="1.8" aria-hidden="true">
      <circle cx="8" cy="9" r="3" stroke={color} />
      <circle cx="16" cy="9" r="3" stroke={color} />
      <path d="M3 19c1-3 3-4.5 5-4.5S12 16 13 19" stroke={color} strokeLinecap="round" />
      <path d="M11 19c1-3 3-4.5 5-4.5s4 1.5 5 4.5" stroke={color} strokeLinecap="round" />
    </svg>
  );
}

export function TabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegação principal"
      className="sticky bottom-0 flex border-t-2 border-ink bg-white"
    >
      {TABS.map((tab) => {
        const active =
          tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10.5px] font-medium ${
              active ? "text-moss-dark" : "text-ink/60"
            }`}
          >
            <TabIcon icon={tab.icon} active={active} />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
