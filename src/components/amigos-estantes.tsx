"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BookThumb } from "@/components/book-thumb";
import { BotaoAddLivroAmigo } from "@/components/botao-add-livro-amigo";
import type { Atividade, FriendItem, FriendShelf } from "@/lib/friends";

const STATUS_LABEL: Record<string, string> = {
  want: "quero ler",
  reading: "lendo",
  finished: "terminei",
  recomendado: "recomendado",
  abandoned: "abandonei",
};

/**
 * Feed dos amigos: os livros de todos, do mais recentemente mexido pro mais
 * antigo (status, nota, comentário público ou sessão de leitura), com busca
 * por nome. Escolhido um amigo, a tela passa a ser a estante dele.
 *
 * Cada livro tem o "adicionar" aqui mesmo. Antes ele só existia depois de abrir
 * o livro, então quem estava passeando pela estante do amigo perdia o fluxo.
 */
export function AmigosEstantes({ shelves }: { shelves: FriendShelf[] }) {
  const [busca, setBusca] = useState("");
  const [selecionado, setSelecionado] = useState<string | null>(null);

  const feed = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const visiveis = termo
      ? shelves.filter((s) => s.name.toLowerCase().includes(termo))
      : shelves;
    return montarFeed(visiveis);
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

      {feed.length === 0 ? (
        <p className="font-serif text-sm italic text-ink-soft">
          Nenhum amigo com esse nome.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {feed.map((entrada) =>
            entrada.tipo === "livro" ? (
              <LivroDoAmigo
                key={entrada.item.id}
                item={entrada.item}
                amigo={entrada.amigo}
                onAbrirAmigo={() => setSelecionado(entrada.amigo.friendId)}
              />
            ) : (
              <Adicionados
                key={entrada.itens[0].id}
                amigo={entrada.amigo}
                itens={entrada.itens}
                onAbrirAmigo={() => setSelecionado(entrada.amigo.friendId)}
              />
            ),
          )}
        </div>
      )}
    </div>
  );
}

type Amigo = { friendId: string; name: string };
type EntradaFeed =
  | { tipo: "livro"; amigo: Amigo; item: FriendItem }
  | { tipo: "adicionados"; amigo: Amigo; itens: FriendItem[] };

function ehSoCadastro(a: Atividade) {
  return a.tipo === "status" && a.noCadastro;
}

/**
 * Todos os livros, mais recente primeiro. Livros que só "entraram na estante"
 * em sequência, do mesmo amigo, viram um card só — uma importação da Amazon
 * não pode empurrar o resto do feed pra baixo com 200 cards iguais.
 */
function montarFeed(shelves: FriendShelf[]): EntradaFeed[] {
  const todos = shelves
    .flatMap((s) =>
      s.items.map((item) => ({ amigo: { friendId: s.friendId, name: s.name }, item })),
    )
    .sort(
      (a, b) =>
        new Date(b.item.atividade.em).getTime() - new Date(a.item.atividade.em).getTime(),
    );

  const feed: EntradaFeed[] = [];
  for (const { amigo, item } of todos) {
    const anterior = feed[feed.length - 1];
    if (ehSoCadastro(item.atividade)) {
      if (anterior?.tipo === "adicionados" && anterior.amigo.friendId === amigo.friendId) {
        anterior.itens.push(item);
        continue;
      }
      if (
        anterior?.tipo === "livro" &&
        anterior.amigo.friendId === amigo.friendId &&
        ehSoCadastro(anterior.item.atividade)
      ) {
        feed[feed.length - 1] = { tipo: "adicionados", amigo, itens: [anterior.item, item] };
        continue;
      }
    }
    feed.push({ tipo: "livro", amigo, item });
  }
  return feed;
}

const ACAO_STATUS: Record<string, string> = {
  want: "quer ler",
  reading: "começou a ler",
  finished: "terminou",
  abandoned: "abandonou",
  platinum: "platinou",
};

function frase(a: Atividade): string {
  switch (a.tipo) {
    case "status":
      return a.noCadastro ? "adicionou à estante" : (ACAO_STATUS[a.status] ?? "atualizou");
    case "nota":
      return `deu ${"★".repeat(a.estrelas)}${"☆".repeat(5 - a.estrelas)}`;
    case "comentario":
      return a.capitulo ? `comentou no cap. ${a.capitulo}` : "comentou";
    case "leitura":
      return a.posicao ? `leu até ${a.posicao}` : "leu um pouco";
  }
}

const dataCurta = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "numeric",
  month: "short",
});

function quando(iso: string): string {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const dias = Math.floor(h / 24);
  if (dias === 1) return "ontem";
  if (dias < 7) return `há ${dias} dias`;
  return dataCurta.format(new Date(iso)).replace(".", "");
}

function CabecalhoAmigo({
  amigo,
  acao,
  em,
  onAbrir,
}: {
  amigo: Amigo;
  acao: string;
  em: string;
  onAbrir: () => void;
}) {
  return (
    <div className="mb-2 flex items-center gap-2">
      <button
        type="button"
        onClick={onAbrir}
        aria-label={`Ver a estante de ${amigo.name}`}
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-mustard text-[10px] font-semibold uppercase"
      >
        {amigo.name.charAt(0)}
      </button>
      <p className="min-w-0 flex-1 truncate text-xs">
        <button type="button" onClick={onAbrir} className="font-semibold">
          {amigo.name}
        </button>{" "}
        <span className="text-ink/70">{acao}</span>
      </p>
      <span className="shrink-0 text-[10.5px] text-ink/50">{quando(em)}</span>
    </div>
  );
}

function Adicionados({
  amigo,
  itens,
  onAbrirAmigo,
}: {
  amigo: Amigo;
  itens: FriendItem[];
  onAbrirAmigo: () => void;
}) {
  const VISIVEIS = 3; // 3 capas no tamanho padrão cabem nos ~390px
  return (
    <div className="rounded-md border-2 border-cover-border bg-white p-2.5">
      <CabecalhoAmigo
        amigo={amigo}
        acao={`adicionou ${itens.length} livros à estante`}
        em={itens[0].atividade.em}
        onAbrir={onAbrirAmigo}
      />
      <div className="flex gap-2">
        {itens.slice(0, VISIVEIS).map((it) => (
          <Link key={it.id} href={`/books/${it.id}`} className="shrink-0">
            <BookThumb item={it} />
          </Link>
        ))}
      </div>
      {itens.length > VISIVEIS && (
        <button
          type="button"
          onClick={onAbrirAmigo}
          className="mt-2 text-[11px] font-semibold text-ink-soft underline underline-offset-2"
        >
          ver todos ›
        </button>
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

function LivroDoAmigo({
  item,
  amigo,
  onAbrirAmigo,
}: {
  item: FriendItem;
  /** No feed, cada livro diz de quem é e o que mudou. Na estante do amigo, não. */
  amigo?: Amigo;
  onAbrirAmigo?: () => void;
}) {
  const a = item.atividade;
  return (
    <div className="rounded-md border-2 border-cover-border bg-white p-2.5">
      {amigo && onAbrirAmigo && (
        <CabecalhoAmigo amigo={amigo} acao={frase(a)} em={a.em} onAbrir={onAbrirAmigo} />
      )}
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
              {amigo && item.stars && a.tipo !== "nota" ? ` · ${"★".repeat(item.stars)}` : ""}
            </span>
            {amigo && a.tipo === "comentario" && (
              <span className="mt-1 line-clamp-2 block font-serif text-xs italic text-ink/75">
                “{a.texto}”
              </span>
            )}
          </Link>
          <div className="mt-2">
            <BotaoAddLivroAmigo itemId={item.id} />
          </div>
        </div>
      </div>
    </div>
  );
}
