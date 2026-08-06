"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { BookCover } from "@/components/book-cover";
import { StarRating } from "@/components/star-rating";
import { setRating } from "@/app/actions/ratings";

const CONFIANTE = "/img/mascot/quill-confiante.webp";

// Status reais do banco (media_items.status). "recomendado" agora é status de
// fato (migração add_recomendado_status).
export type DbStatus = "reading" | "want" | "finished" | "abandoned" | "recomendado";

export type ShelfBook = {
  id: string;
  title: string;
  creator: string | null;
  cover_kind: string;
  cover_url: string | null;
  cover_palette: number;
  status: DbStatus;
  stars: number; // 0 = sem nota
};

const STATUS_META: Record<DbStatus, { label: string; bg: string; text: string }> = {
  reading: { label: "Lendo", bg: "bg-coral", text: "text-paper" },
  want: { label: "Quero ler", bg: "bg-mustard", text: "text-ink" },
  finished: { label: "Terminei", bg: "bg-moss", text: "text-paper" },
  recomendado: { label: "Recomendado", bg: "bg-navy", text: "text-paper" },
  abandoned: { label: "Abandonei", bg: "bg-ink-soft", text: "text-paper" },
};

const FILTROS: { status: DbStatus | "todos"; label: string }[] = [
  { status: "todos", label: "Todos" },
  { status: "reading", label: "Lendo" },
  { status: "want", label: "Quero ler" },
  { status: "finished", label: "Terminei" },
  { status: "recomendado", label: "Recomendados" },
  { status: "abandoned", label: "Abandonei" },
];

export function EstanteShelf({ books }: { books: ShelfBook[] }) {
  const [filtro, setFiltro] = useState<DbStatus | "todos">("todos");
  // Notas em estado local para atualização otimista ao clicar nas estrelas.
  const [notas, setNotas] = useState<Record<string, number>>(
    () => Object.fromEntries(books.map((b) => [b.id, b.stars])),
  );
  const [, startTransition] = useTransition();

  const onNota = (id: string, n: number) => {
    setNotas((prev) => ({ ...prev, [id]: n }));
    startTransition(() => setRating(id, n));
  };

  const counts = useMemo(() => {
    const map: Record<DbStatus, number> = {
      reading: 0,
      want: 0,
      finished: 0,
      recomendado: 0,
      abandoned: 0,
    };
    for (const b of books) map[b.status]++;
    return map;
  }, [books]);

  const total = books.length;
  const filtrados = filtro === "todos" ? books : books.filter((b) => b.status === filtro);

  const media = useMemo(() => {
    const vals = books.map((b) => notas[b.id] ?? 0).filter((n) => n > 0);
    return vals.length ? (vals.reduce((s, n) => s + n, 0) / vals.length).toFixed(1) : "—";
  }, [books, notas]);

  if (total === 0) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-12 text-center">
        <Image src={CONFIANTE} alt="" width={128} height={128} className="h-32 w-32" />
        <h2 className="font-display text-2xl text-ink">Sua estante está vazia</h2>
        <p className="font-serif text-sm text-ink-soft">
          Coloque o primeiro livro para o Quill saber por onde te acompanhar.
        </p>
        <Link
          href="/books/new"
          className="rounded-md border-2 border-ink bg-coral px-5 py-2.5 text-sm font-semibold text-paper shadow-hard"
        >
          Adicionar meu 1º livro
        </Link>
      </main>
    );
  }

  return (
    <main className="flex flex-col gap-5 px-4 py-5 pb-8">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-md border-2 border-ink bg-coral p-5 shadow-hard">
        <div className="relative z-10 max-w-[70%]">
          <h2 className="font-display text-2xl uppercase leading-none text-paper">
            {total} {total === 1 ? "livro" : "livros"}
          </h2>
          <p className="mt-1 font-serif text-base italic leading-tight text-paper/90">
            na sua estante
          </p>
        </div>
        <div className="absolute -bottom-3 -right-3 flex h-24 w-24 rotate-12 items-center justify-center rounded-full border-2 border-ink bg-mustard">
          <Image src={CONFIANTE} alt="" width={64} height={64} className="h-16 w-16 -rotate-12" />
        </div>
      </div>

      {/* Stats — Total / Lendo / Nota (idêntico ao Lovable) */}
      <div className="flex gap-3">
        {[
          { label: "Total", value: total, bg: "bg-moss", fg: "text-paper" },
          { label: "Lendo", value: counts.reading, bg: "bg-mustard", fg: "text-ink" },
          { label: "Nota", value: media, bg: "bg-paper", fg: "text-ink" },
        ].map((s) => (
          <div
            key={s.label}
            className={`flex flex-1 flex-col items-center gap-0.5 rounded-md border-2 border-ink px-2 py-2 shadow-hard-sm ${s.bg}`}
          >
            <span
              className={`font-display text-[10px] uppercase tracking-wider ${s.fg} ${
                s.label === "Nota" ? "opacity-60" : ""
              }`}
            >
              {s.label}
            </span>
            <span className={`font-display text-xl ${s.fg}`}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="scrollbar-hide flex gap-2 overflow-x-auto pb-2">
        {FILTROS.map((f) => {
          const active = filtro === f.status;
          const n = f.status === "todos" ? total : counts[f.status];
          return (
            <button
              key={f.status}
              type="button"
              onClick={() => setFiltro(f.status)}
              className={`shrink-0 rounded-full border-2 border-ink px-4 py-1.5 text-xs font-bold uppercase tracking-wider shadow-hard-sm active:translate-x-[1px] active:translate-y-[1px] active:shadow-none ${
                active ? "bg-ink text-paper" : "bg-paper text-ink"
              }`}
            >
              {f.label} <span className={active ? "text-paper/70" : "text-ink-soft"}>{n}</span>
            </button>
          );
        })}
      </div>

      {/* Prateleira de madeira */}
      <div className="rounded-md border-2 border-ink bg-[#8B5E3C] p-3 shadow-hard">
        <div className="rounded-sm border-2 border-ink bg-paper p-4">
          {filtrados.length === 0 ? (
            <p className="py-6 text-center font-serif text-sm italic text-ink-soft">
              Nenhum livro com esse status ainda.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-x-3 gap-y-6">
              {filtrados.map((b) => (
                <div key={b.id} className="flex flex-col gap-2">
                  <Link
                    href={`/books/${b.id}`}
                    aria-label={`Abrir ${b.title} — ${STATUS_META[b.status].label}`}
                    className="block"
                  >
                    <div className="aspect-[2/3] w-full">
                      <BookCover
                        item={{
                          title: b.title,
                          cover_kind: b.cover_kind,
                          cover_url: b.cover_url,
                          cover_palette: b.cover_palette,
                        }}
                      />
                    </div>
                  </Link>
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <h4 className="line-clamp-1 font-display text-sm text-ink">{b.title}</h4>
                    {b.creator && (
                      <p className="line-clamp-1 font-serif text-[11px] italic text-ink-soft">
                        {b.creator}
                      </p>
                    )}
                    <StarRating value={notas[b.id] ?? 0} onChange={(n) => onNota(b.id, n)} size="sm" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="mt-3 h-3 rounded-sm border-2 border-ink bg-[#6D462A]" />
      </div>
    </main>
  );
}
