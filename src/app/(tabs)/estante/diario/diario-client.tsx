"use client";

import Link from "next/link";
import { AppImage } from "@/components/app-image";
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

const PALETAS = Object.keys(SPINE_BG) as EntradaDiario["cover_palette"][];

/** Cor da lombada = paleta do livro; sem paleta, sorteio estável pelo id. */
function paletaDaEntrada(entrada: EntradaDiario): EntradaDiario["cover_palette"] {
  if (entrada.cover_palette) return entrada.cover_palette;
  const chave = entrada.livroId || entrada.id;
  let hash = 0;
  for (let i = 0; i < chave.length; i += 1) hash = (hash * 31 + chave.charCodeAt(i)) >>> 0;
  return PALETAS[hash % PALETAS.length]!;
}

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
    <div className="flex flex-1 flex-col bg-paper">
      <header className="sticky top-0 z-20 border-b-2 border-ink bg-paper px-4 pb-3 pt-4">
        <div className="flex items-center justify-between gap-2">
          <Link
            href="/estante"
            className="flex shrink-0 items-center gap-1 text-sm font-bold text-ink"
          >
            <span aria-hidden>‹</span> Estante
          </Link>

          <h1 className="font-display text-xl uppercase leading-none tracking-tight text-ink">
            Meu diário
          </h1>

          <span className="flex shrink-0 items-center gap-1 rounded-full border-2 border-ink bg-card px-3 py-1 text-[11px] font-bold text-ink shadow-hard-sm">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <rect x="4" y="10" width="16" height="11" rx="2" />
              <path d="M8 10V7a4 4 0 0 1 8 0v3" />
            </svg>
            privado
          </span>
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
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
        <EmptyDiario semNenhuma={entradas.length === 0} />
      ) : (
        <>
          <ul className="flex flex-1 flex-col gap-3 px-4 py-4">
            {visiveis.map((e) => (
              <EntradaItem key={e.id} entrada={e} />
            ))}
          </ul>
          <p className="px-8 pb-6 text-center font-serif text-xs leading-snug text-ink-soft">
            Tudo aqui é seu e privado por padrão — cada item pode virar público na
            página do livro.
          </p>
        </>
      )}
    </div>
  );
}

function EntradaItem({ entrada }: { entrada: EntradaDiario }) {
  const paleta = paletaDaEntrada(entrada);
  return (
    <li className="flex items-stretch gap-2">
      <div
        className={`flex w-11 shrink-0 items-center justify-center overflow-hidden rounded-md border-2 border-ink px-1 py-2 text-center shadow-hard-sm ${SPINE_BG[paleta]}`}
      >
        <span className="line-clamp-4 break-words font-serif text-[8px] font-bold uppercase leading-[1.15] tracking-tight text-ink">
          {entrada.livroTitulo}
        </span>
      </div>

      <div className="min-w-0 flex-1 rounded-md border-2 border-ink bg-card p-3 shadow-hard">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="min-w-0 truncate text-[13px] font-bold leading-tight text-ink">
            <Link href={`/books/${entrada.livroId}`} className="hover:underline">
              {entrada.livroTitulo}
            </Link>
            <span className="font-semibold text-ink-soft">
              {" · "}
              {formatData(entrada.data).toLowerCase()}
            </span>
          </h3>
          {entrada.publico ? (
            <span className="shrink-0 text-[9px] font-bold uppercase tracking-wide text-ink-soft">
              Público
            </span>
          ) : null}
        </div>
        {entrada.capitulo ? (
          <span className="mt-0.5 block text-[10px] font-semibold text-ink-soft">
            {entrada.capitulo}
          </span>
        ) : null}
        <p className="mt-1 font-serif text-[14px] leading-snug text-ink">{entrada.texto}</p>
      </div>
    </li>
  );
}

function EmptyDiario({ semNenhuma }: { semNenhuma: boolean }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 py-16 text-center">
      <AppImage
        slot="diario.vazio"
        src="/img/mascot/quill-escrevendo.webp"
        alt="Quill escrevendo no caderno"
        width={200}
        height={133}
        className="w-40 max-w-full"
      />
      <p className="max-w-[280px] font-serif text-sm leading-snug text-ink-soft">
        {semNenhuma
          ? "Ainda sem anotações. Elas aparecem aqui quando você comentar em um livro ou registrar um “pra não esquecer”."
          : "Nenhuma entrada com esse filtro."}
      </p>
      {semNenhuma && (
        <Link
          href="/estante"
          className="shadow-hard-sm rounded-md border-2 border-ink bg-mustard px-4 py-2.5 font-display text-xs uppercase tracking-wider text-ink active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
        >
          Ir para a estante
        </Link>
      )}
    </div>
  );
}
