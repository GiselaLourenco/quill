"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { BookThumb } from "@/components/book-thumb";
import { BotaoAddLivroAmigo } from "@/components/botao-add-livro-amigo";
import type { Atividade, FriendItem, FriendShelf } from "@/lib/friends";
import { CaixaComentario } from "@/components/caixa-comentario";
import { comentarAtualizacao, curtirAtualizacao } from "@/app/actions/interacoes";
import { SEM_INTERACOES, type InteracoesCartao } from "@/lib/interacoes";
import { ModalPerfilAmigo } from "@/components/perfil-amigo";


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
 * por nome. Tocar num amigo abre o mesmo modal "Perfil do amigo" do Perfil.
 *
 * Cada livro tem o "adicionar" aqui mesmo. Antes ele só existia depois de abrir
 * o livro, então quem estava passeando pela estante do amigo perdia o fluxo.
 */
export function AmigosEstantes({
  shelves,
  foco,
  demo = false,
}: {
  shelves: FriendShelf[];
  /** Vindo do sino: "itemId|chave" do cartão pra rolar até ele e destacar. */
  foco?: string;
  /** /estante/demo: curtir e comentar ficam só na tela. */
  demo?: boolean;
}) {
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

  // Veio do sino mas o cartão não está mais no feed (o amigo já fez outra
  // atualização nesse livro): a conversa continua na página do livro.
  const [focoItem, focoChave] = foco?.split("|") ?? [];
  const focoSumiu =
    !!focoItem &&
    !feed.some((e) => e.tipo === "livro" && e.item.id === focoItem && e.item.chave === focoChave);

  return (
    <div className="flex flex-col gap-4">
      {aberta && (
        <ModalPerfilAmigo
          nome={aberta.name}
          livros={aberta.items}
          onClose={() => setSelecionado(null)}
        />
      )}
      {focoSumiu && (
        <Link
          href={`/books/${focoItem}?conversa=${encodeURIComponent(focoChave ?? "")}`}
          className="rounded-md border-2 border-ink bg-mustard/30 px-3 py-2 text-xs text-ink"
        >
          Essa atualização já não está no feed. <span className="font-semibold underline">Ver a conversa no livro ›</span>
        </Link>
      )}
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
                comAcoes
                demo={demo}
                emFoco={foco === `${entrada.item.id}|${entrada.item.chave}`}
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

function LivroDoAmigo({
  item,
  amigo,
  onAbrirAmigo,
  comAcoes = false,
  demo = false,
  emFoco = false,
}: {
  item: FriendItem;
  /** Curtir/comentar a última atualização do livro (feed e estante do amigo). */
  comAcoes?: boolean;
  demo?: boolean;
  /** Veio do sino: rola até aqui e pisca a borda. */
  emFoco?: boolean;
  /** No feed, cada livro diz de quem é e o que mudou. Na estante do amigo, não. */
  amigo?: Amigo;
  onAbrirAmigo?: () => void;
}) {
  const a = item.atividade;
  const ref = useRef<HTMLDivElement>(null);
  const [destaque, setDestaque] = useState(emFoco);
  useEffect(() => {
    if (!emFoco) return;
    ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    const t = setTimeout(() => setDestaque(false), 2400);
    return () => clearTimeout(t);
  }, [emFoco]);
  return (
    <div
      ref={ref}
      id={`cartao-${item.id}`}
      className={`rounded-md border-2 bg-white p-2.5 transition-colors duration-700 ${
        destaque ? "border-mustard shadow-[0_0_0_3px_var(--color-mustard)]" : "border-cover-border"
      }`}
    >
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
      {comAcoes && <RodapeCartao itemId={item.id} chave={item.chave} inicial={item.interacoes ?? SEM_INTERACOES} demo={demo} />}
    </div>
  );
}

/**
 * Rodapé do cartão no feed: comentários da atualização e, no canto inferior
 * direito, "comentar" + curtir. Curtida e comentário valem pra ESTA
 * atualização (ver src/lib/interacoes.ts) e avisam no sino o dono e quem já
 * interagiu com o cartão.
 */
export function RodapeCartao({
  itemId,
  chave,
  inicial,
  demo = false,
}: {
  itemId: string;
  chave: string;
  inicial: InteracoesCartao;
  demo?: boolean;
}) {
  // Otimista: o número e o coração mudam na hora; se o servidor recusar, volta.
  const [curtiu, setCurtiu] = useState(inicial.euCurti);
  const [total, setTotal] = useState(inicial.curtidas);
  const [comentando, setComentando] = useState(false);
  const [comentarios, setComentarios] = useState(inicial.comentarios);
  const [erro, setErro] = useState<string | null>(null);

  async function alternarCurtida() {
    const antes = { curtiu, total };
    setErro(null);
    setCurtiu(!curtiu);
    setTotal(total + (curtiu ? -1 : 1));
    if (demo) return;
    const r = await curtirAtualizacao({ itemId, chave });
    if (r.error) {
      setCurtiu(antes.curtiu);
      setTotal(antes.total);
      setErro(r.error);
    }
  }

  return (
    <div className="mt-2">
      {comentarios.length > 0 && (
        <ul className="mb-2 space-y-1.5">
          {comentarios.map((k) => (
            <li key={k.id} className="flex justify-start">
              <div
                className="max-w-[85%] border-l-2 border-ink/15 pl-3 text-[12px] leading-snug text-ink"
              >
                <span className="font-semibold">{k.meu ? "Você" : k.nome}</span>{" "}
                {k.texto && <span>{k.texto}</span>}
                <span className="ml-1.5 text-[10px] text-ink-soft">{k.quando}</span>
                {k.gifUrl && (
                  // eslint-disable-next-line @next/next/no-img-element -- GIF externo do Giphy
                  <img
                    src={k.gifUrl}
                    alt="GIF"
                    className="mt-1.5 block max-h-28 rounded border-2 border-cover-border"
                  />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {erro && <p className="mb-1 text-right text-[11px] font-semibold text-coral">{erro}</p>}

      {comentando ? (
        <CaixaComentario
          onCancelar={() => setComentando(false)}
          onEnviar={async (texto, gifUrl) => {
            if (!demo) {
              const r = await comentarAtualizacao({ itemId, chave, content: texto, gifUrl });
              if (r.error) return r.error;
            }
            setComentarios((c) => [
              ...c,
              { id: `novo-${Date.now()}`, nome: "Você", texto: texto.trim() || null, gifUrl, quando: "agora", meu: true },
            ]);
            setComentando(false);
            return null;
          }}
        />
      ) : (
        <div className="-mb-1 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => setComentando(true)}
            className="text-[11px] font-semibold text-ink-soft underline underline-offset-2"
          >
            comentar
          </button>
          <button
            type="button"
            onClick={alternarCurtida}
            aria-pressed={curtiu}
            aria-label={curtiu ? "Descurtir" : "Curtir"}
            className={`flex items-center gap-1 py-0.5 text-[11px] font-semibold tabular-nums transition-colors ${
              curtiu ? "text-coral" : "text-ink/40"
            }`}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill={curtiu ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M12 20s-7-4.4-9.2-8.6C1.3 8.3 3 4.5 6.6 4.5c2.1 0 3.4 1.2 4.4 2.6 1-1.4 2.3-2.6 4.4-2.6 3.6 0 5.3 3.8 3.8 6.9C19 15.6 12 20 12 20z" />
            </svg>
            {total > 0 && <span>{total}</span>}
          </button>
        </div>
      )}
    </div>
  );
}
