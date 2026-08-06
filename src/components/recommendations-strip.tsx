"use client";

import { useState } from "react";
import Link from "next/link";
import type { ReceivedRec } from "@/lib/recommendations";

// Sino de "Indicações pra você" no topo da Estante dos amigos: recolhido por
// padrão (só o sino + contador), abre pra listar todas. Sem dispensar por ora —
// tudo fica guardado aqui (excluir/arquivar é trabalho futuro).
export function RecommendationsStrip({ recs }: { recs: ReceivedRec[] }) {
  const [open, setOpen] = useState(false);

  if (recs.length === 0) return null;

  return (
    <section
      className={`mb-4 overflow-hidden rounded-xl border-2 bg-white ${
        open ? "border-navy" : "border-ink"
      }`}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
      >
        <span className="relative inline-flex">
          <span className={`text-xl ${open ? "text-navy" : ""}`} aria-hidden="true">
            🔔
          </span>
          <span className="absolute -right-1.5 -top-1 flex h-[15px] min-w-[15px] items-center justify-center rounded-full border-[1.5px] border-ink bg-coral px-[2px] text-[9.5px] font-semibold text-paper">
            {recs.length}
          </span>
        </span>
        <span className={`flex-1 text-sm font-medium ${open ? "text-navy" : ""}`}>
          Indicações pra você
        </span>
        <span className="text-ink/50" aria-hidden="true">
          {open ? "▲" : "▼"}
        </span>
      </button>

      {open && (
        <ul className="flex flex-col gap-2 border-t-2 border-cover-border p-2">
          {recs.map((r) => (
            <li
              key={r.id}
              className="flex items-center gap-2 rounded-lg border-2 border-cover-border px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{r.title}</p>
                <p className="text-[11px] text-ink/60">
                  {r.fromName} indicou
                  {r.message ? ` · “${r.message}”` : ""}
                </p>
              </div>
              {r.itemRef && (
                <Link
                  href={`/books/${r.itemRef}`}
                  className="shrink-0 rounded border-2 border-ink bg-moss-dark px-2.5 py-1 text-xs font-medium text-paper"
                >
                  ver
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
