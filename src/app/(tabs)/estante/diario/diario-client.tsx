"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { EntradaDiario } from "@/lib/types";

type Filtro = "todos" | "livro" | "capitulo" | "publico" | "privado";

const FILTROS: { id: Filtro; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "livro", label: "Livro" },
  { id: "capitulo", label: "Capítulo" },
  { id: "publico", label: "Público" },
  { id: "privado", label: "Privado" },
];

const SPINE_BG: Record<EntradaDiario["cover_palette"], string> = {
  "cover-1": "bg-cover-1",
  "cover-2": "bg-cover-2",
  "cover-3": "bg-cover-3",
  "cover-4": "bg-cover-4",
};

function formatData(iso: string): string {
  const d = new Date(iso);
  const hoje = new Date();
  const ontem = new Date();
  ontem.setDate(hoje.getDate() - 1);
  const mesmoDia = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  const hora = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  if (mesmoDia(d, hoje)) return `Hoje, ${hora}`;
  if (mesmoDia(d, ontem)) return `Ontem, ${hora}`;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(".", "");
}

export default function DiarioClient({ entradas }: { entradas: EntradaDiario[] }) {
  const [filtro, setFiltro] = useState<Filtro>("todos");

  const visiveis = useMemo(() => {
    return entradas.filter((e) => {
      if (filtro === "todos") return true;
      if (filtro === "livro") return e.tipo === "livro";
      if (filtro === "capitulo") return e.tipo === "capitulo";
      if (filtro === "publico") return e.publico;
      if (filtro === "privado") return !e.publico;
      return true;
    });
  }, [entradas, filtro]);

  return (
    <div className="flex min-h-full flex-col bg-paper">
      <header className="sticky top-0 z-20 border-b-2 border-ink bg-paper px-5 pb-4 pt-4">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/estante"
              aria-label="Voltar"
              className="flex h-8 w-8 items-center justify-center border-2 border-ink bg-paper shadow-hard-sm"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="font-display text-2xl uppercase tracking-tight text-ink">Diário</h1>
          </div>
          <span className="rounded-full border-2 border-ink bg-paper px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-ink">
            Privado
          </span>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
          {FILTROS.map((f) => {
            const active = f.id === filtro;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setFiltro(f.id)}
                className={`shrink-0 whitespace-nowrap rounded-full border-2 border-ink px-4 py-1.5 text-xs font-bold ${
                  active ? "bg-ink text-paper" : "bg-paper text-ink shadow-hard-sm"
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </header>

      {visiveis.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center">
          <span className="text-6xl" aria-hidden>📖</span>
          <p className="max-w-[260px] font-serif text-sm text-ink-soft">
            {entradas.length === 0
              ? "Ainda sem anotações. Elas aparecem aqui quando você comentar em um livro."
              : "Nenhuma entrada com esse filtro."}
          </p>
        </div>
      ) : (
        <ul className="flex flex-1 flex-col gap-4 px-5 py-6">
          {visiveis.map((e) => (
            <li key={e.id} className="relative flex gap-4 border-2 border-ink bg-paper p-4 shadow-hard">
              <div
                className={`w-3 shrink-0 self-stretch border-2 border-ink ${SPINE_BG[e.cover_palette]}`}
                aria-hidden
              />
              <div className="min-w-0 flex-1 space-y-2 pt-0.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link href={`/books/${e.livroId}`} className="hover:underline">
                      <h3 className="truncate text-xs font-bold uppercase leading-none text-ink">
                        {e.livroTitulo}
                      </h3>
                    </Link>
                    <span className="mt-1 block text-[10px] font-semibold text-ink-soft">
                      {formatData(e.data)}
                      {e.capitulo ? ` • ${e.capitulo}` : ""}
                    </span>
                  </div>
                  <span
                    className={`shrink-0 border border-ink px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                      e.publico ? "bg-paper text-ink shadow-hard-sm" : "bg-paper text-ink"
                    }`}
                  >
                    {e.publico ? "Público" : "Privado"}
                  </span>
                </div>
                <p className="font-serif text-lg leading-snug text-ink">{e.texto}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
