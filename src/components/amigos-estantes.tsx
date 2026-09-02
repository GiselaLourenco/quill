"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { BookThumb } from "@/components/book-thumb";
import { addFriendBookToShelf } from "@/app/actions/media-items";
import type { FriendShelf } from "@/lib/friends";

const STATUS_LABEL: Record<string, string> = {
  want: "quero ler",
  reading: "lendo",
  finished: "terminei",
  recomendado: "recomendado",
  abandoned: "abandonei",
};

/**
 * Estantes dos amigos, com busca por nome.
 *
 * Com poucos amigos a lista inteira cabe; com muitos ela vira rolagem sem fim,
 * e achar a estante de alguém específico fica caro. A busca filtra por nome e,
 * escolhido um amigo, some com o resto — a tela passa a ser a estante dele.
 *
 * Cada livro tem o "adicionar" aqui mesmo. Antes ele só existia depois de abrir
 * o livro, então quem estava passeando pela estante do amigo perdia o fluxo.
 */
export function AmigosEstantes({ shelves }: { shelves: FriendShelf[] }) {
  const [busca, setBusca] = useState("");
  const [selecionado, setSelecionado] = useState<string | null>(null);

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return shelves;
    return shelves.filter((s) => s.name.toLowerCase().includes(termo));
  }, [shelves, busca]);

  const aberta = selecionado ? shelves.find((s) => s.friendId === selecionado) : null;

  if (aberta) {
    return (
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => setSelecionado(null)}
          className="shadow-hard-sm self-start rounded-md border-2 border-ink bg-paper px-3 py-1.5 font-display text-[10px] uppercase tracking-widest active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
        >
          ‹ todos os amigos
        </button>
        <Estante shelf={aberta} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Só aparece quando há mais de uma estante: com uma, filtrar não ajuda. */}
      {shelves.length > 1 && (
        <input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar amigo pelo nome"
          aria-label="Buscar amigo pelo nome"
          className="shadow-hard-sm w-full rounded-md border-2 border-ink bg-paper px-3 py-2 font-serif text-sm"
        />
      )}

      {filtradas.length === 0 ? (
        <p className="font-serif text-sm italic text-ink-soft">
          Nenhum amigo com esse nome.
        </p>
      ) : (
        filtradas.map((shelf) => (
          <Estante
            key={shelf.friendId}
            shelf={shelf}
            onAbrir={() => setSelecionado(shelf.friendId)}
          />
        ))
      )}
    </div>
  );
}

function Estante({ shelf, onAbrir }: { shelf: FriendShelf; onAbrir?: () => void }) {
  return (
    <section>
      <div className="mb-2 flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-ink bg-mustard text-xs font-semibold uppercase">
          {shelf.name.charAt(0)}
        </span>
        <span className="flex-1 text-sm font-semibold">{shelf.name}</span>
        {onAbrir && (
          <button
            type="button"
            onClick={onAbrir}
            className="text-[11px] font-semibold text-ink-soft underline underline-offset-2"
          >
            só a estante dele ›
          </button>
        )}
      </div>
      <div className="flex flex-col gap-2">
        {shelf.items.map((it) => (
          <LivroDoAmigo key={it.id} item={it} />
        ))}
      </div>
    </section>
  );
}

function LivroDoAmigo({ item }: { item: FriendShelf["items"][number] }) {
  const [estado, setEstado] = useState<"idle" | "feito" | "ja-tinha">("idle");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  function adicionar() {
    setErro(null);
    iniciar(async () => {
      const r = await addFriendBookToShelf({ sourceItemId: item.id });
      // "já está na sua estante" vem com itemId: é aviso, não falha.
      if (r.error && !r.itemId) {
        setErro(r.error);
        return;
      }
      setEstado(r.error ? "ja-tinha" : "feito");
    });
  }

  return (
    <div className="rounded-md border-2 border-cover-border bg-white p-2.5">
      <div className="flex gap-3">
        <Link href={`/books/${item.id}`} className="shrink-0">
          <BookThumb item={item} />
        </Link>
        <div className="min-w-0 flex-1">
          <Link href={`/books/${item.id}`} className="block">
            <span className="block truncate text-sm font-medium">{item.title}</span>
            <span className="block text-[10.5px] text-ink/55">
              {STATUS_LABEL[item.status] ?? item.status}
              {item.progressLabel ? ` · ${item.progressLabel}` : ""}
            </span>
          </Link>

          {estado === "idle" ? (
            <button
              type="button"
              onClick={adicionar}
              disabled={pendente}
              className="shadow-hard-sm mt-2 rounded-md border-2 border-ink bg-coral px-2.5 py-1 font-display text-[10px] uppercase tracking-wider text-paper active:translate-x-[1px] active:translate-y-[1px] active:shadow-none disabled:opacity-60"
            >
              {pendente ? "Adicionando…" : "+ minha estante"}
            </button>
          ) : (
            <p className="mt-2 font-display text-[10px] uppercase tracking-wider text-moss-dark">
              {estado === "feito" ? "✓ na sua estante" : "já estava na sua estante"}
            </p>
          )}

          {erro && <p className="mt-1 text-[11px] font-medium text-coral">{erro}</p>}
        </div>
      </div>
    </div>
  );
}
