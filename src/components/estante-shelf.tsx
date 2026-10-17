"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { AppImage } from "@/components/app-image";
import { EmptyState } from "@/components/empty-state";
import { BotaoFlutuante } from "@/components/botao-flutuante";
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
  /** Marca "recomendado" — convive com o status de leitura (recomendado + quero ler, etc.). */
  recomendado?: boolean;
  stars: number; // 0 = sem nota
  total_units: number | null; // páginas
  percent_lido: number | null; // posição atual ÷ total (páginas ou capítulos) — null sem dado
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

const ehRecomendado = (b: ShelfBook) => !!b.recomendado || b.status === "recomendado";

/** Sem acento e sem caixa, pra "harry potter" achar "Harry Potter e a...". */
const normalizar = (t: string) =>
  t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

/** "500k" pra somas grandes; abaixo de mil, o número puro. */
function formatarPaginas(paginas: number): string {
  if (paginas < 1000) return String(paginas);
  const emK = paginas / 1000;
  const casas = Number.isInteger(emK) ? 0 : 1;
  return `${emK.toFixed(casas)}k`;
}

// Grade de 3 colunas: 4 linhas de largada cobre a tela sem rolar demais antes
// de decidir se quer ver mais. Cresce de 20 em 20 — o mesmo tamanho de lote do
// import do Kindle, que é o cenário que faria uma estante ficar realmente longa.
const COLUNAS = 3;
const VISIVEL_INICIAL = COLUNAS * 4;
const INCREMENTO = 20;

// Abrir um livro e voltar desmonta esta tela inteira (rota diferente) — sem
// isto, filtro/busca/paginação voltavam sempre pro estado inicial.
const CHAVE_ESTADO = "quill:estante:estado";

export function EstanteShelf({
  books,
  readOnly = false,
  ownerName,
}: {
  books: ShelfBook[];
  /** Estante de outra pessoa: sem editar nota, sem botão de adicionar, sem persistir filtro/busca. */
  readOnly?: boolean;
  ownerName?: string;
}) {
  const [filtro, setFiltro] = useState<DbStatus | "todos">("todos");
  const [busca, setBusca] = useState("");
  const [visivel, setVisivel] = useState(VISIVEL_INICIAL);
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
    // Um livro recomendado conta no status de leitura dele E em
    // "Recomendados". O status `recomendado` sozinho (ainda não decidiu) só
    // conta lá.
    for (const b of books) {
      if (b.status !== "recomendado") map[b.status]++;
      if (ehRecomendado(b)) map.recomendado++;
    }
    return map;
  }, [books]);

  const total = books.length;

  const filtrados = useMemo(() => {
    const porStatus =
      filtro === "todos"
        ? books
        : filtro === "recomendado"
          ? books.filter(ehRecomendado)
          : books.filter((b) => b.status === filtro);
    const termo = normalizar(busca);
    if (!termo) return porStatus;
    return porStatus.filter(
      (b) => normalizar(b.title).includes(termo) || (b.creator && normalizar(b.creator).includes(termo)),
    );
  }, [books, filtro, busca]);

  // Trocar filtro ou buscar de novo volta pro topo da paginação — senão a
  // pessoa via "carregar mais" sumido porque já tinha revelado mais do que a
  // lista filtrada tem. Ajustar o estado durante a renderização (em vez de um
  // useEffect) evita o re-render extra de "renderiza com o valor velho, dispara
  // o efeito, renderiza de novo".
  const chaveFiltro = `${filtro} ${busca}`;
  const [chaveAnterior, setChaveAnterior] = useState(chaveFiltro);
  if (chaveFiltro !== chaveAnterior) {
    setChaveAnterior(chaveFiltro);
    setVisivel(VISIVEL_INICIAL);
  }

  // Restaura filtro/busca/paginação de uma visita anterior — uma vez, no
  // montar. As três juntas (inclusive `chaveAnterior`) pra não disparar o
  // reset de paginação acima assim que o filtro restaurado "muda".
  const restauradoRef = useRef(false);
  useEffect(() => {
    if (readOnly) return;
    try {
      const salvo = sessionStorage.getItem(CHAVE_ESTADO);
      if (salvo) {
        const estado = JSON.parse(salvo) as { filtro?: string; busca?: string; visivel?: number };
        const filtroSalvo = (estado.filtro ?? "todos") as DbStatus | "todos";
        const buscaSalva = estado.busca ?? "";
        // Ler o que uma visita anterior salvou e sincronizar o estado é
        // exatamente o caso que o hook serve — só acontece uma vez, no montar.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setFiltro(filtroSalvo);
        setBusca(buscaSalva);
        if (typeof estado.visivel === "number") setVisivel(estado.visivel);
        setChaveAnterior(`${filtroSalvo} ${buscaSalva}`);
      }
    } catch {
      // sessionStorage indisponível (aba anônima etc.) — segue com o padrão.
    }
    restauradoRef.current = true;
  }, [readOnly]);

  // Salva a cada mudança — mas só depois que a restauração acima já rodou,
  // senão o primeiro render (com os padrões) sobrescreveria o que tinha sido
  // salvo antes dele ser lido.
  useEffect(() => {
    if (readOnly || !restauradoRef.current) return;
    try {
      sessionStorage.setItem(CHAVE_ESTADO, JSON.stringify({ filtro, busca, visivel }));
    } catch {
      // idem
    }
  }, [filtro, busca, visivel, readOnly]);

  const visiveis = filtrados.slice(0, visivel);
  const restantes = filtrados.length - visiveis.length;

  // Só livros terminados contam — página de um livro "quero ler" ou "lendo"
  // ainda não foi lida de verdade.
  const paginasLidas = useMemo(
    () =>
      books
        .filter((b) => b.status === "finished")
        .reduce((soma, b) => soma + (b.total_units ?? 0), 0),
    [books],
  );

  if (total === 0) {
    return (
      <main className="flex flex-1 flex-col">
        <EmptyState
          mascote="lendo"
          titulo={readOnly ? "Estante vazia" : "Sua estante está vazia"}
          texto={
            readOnly
              ? `${ownerName ?? "Essa pessoa"} ainda não adicionou nenhum livro.`
              : "Coloque o primeiro livro para o Quill saber por onde te acompanhar."
          }
          acao={readOnly ? undefined : { href: "/books/new", label: "Adicionar meu 1º livro" }}
        />
      </main>
    );
  }

  return (
    // `pb` extra: o botão flutuante fica sobre o fim da lista, e sem folga ele
    // taparia a última fileira de capas.
    <main className="flex flex-col gap-5 px-4 py-5 pb-24">
      {/* Só com estante cheia. Vazia, o próprio estado vazio já tem o botão
          grande de adicionar — dois botões pra mesma coisa competiriam. Numa
          estante de outra pessoa, adicionar aqui não faz sentido. */}
      {!readOnly && <BotaoFlutuante href="/books/new" rotulo="Adicionar livro" />}
      {/* Hero */}
      <div className="relative overflow-hidden rounded-md border-2 border-ink bg-coral p-5 shadow-hard">
        <div className="relative z-10 max-w-[70%]">
          <h2 className="font-display text-2xl uppercase leading-none text-paper">
            {total} {total === 1 ? "livro" : "livros"}
          </h2>
          <p className="mt-1 font-serif text-base italic leading-tight text-paper/90">
            {readOnly && ownerName ? `na estante de ${ownerName}` : "na sua estante"}
          </p>
        </div>
        <div className="absolute -bottom-3 -right-3 flex h-24 w-24 rotate-12 items-center justify-center rounded-full border-2 border-ink bg-mustard">
          <AppImage slot="estante.hero" src={CONFIANTE} alt="" width={64} height={64} className="h-16 w-16 -rotate-12" />
        </div>
      </div>

      {/* Stats — Total / Lendo / Páginas */}
      <div className="flex gap-3">
        {[
          { label: "Total", value: String(total), bg: "bg-moss", fg: "text-paper" },
          { label: "Lendo", value: String(counts.reading), bg: "bg-mustard", fg: "text-ink" },
          { label: "Páginas", value: formatarPaginas(paginasLidas), bg: "bg-paper", fg: "text-ink" },
        ].map((s) => (
          <div
            key={s.label}
            className={`flex flex-1 flex-col items-center gap-0.5 rounded-md border-2 border-ink px-2 py-2 shadow-hard-sm ${s.bg}`}
          >
            <span className={`font-display text-[10px] uppercase tracking-wider ${s.fg}`}>
              {s.label}
            </span>
            <span className={`font-display text-xl ${s.fg} whitespace-nowrap`}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* Busca */}
      <label className="relative block">
        <span className="sr-only">Buscar por título ou autor</span>
        <svg
          viewBox="0 0 24 24"
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por título ou autor"
          className="w-full rounded-md border-2 border-ink bg-paper py-2 pl-9 pr-3 text-sm shadow-hard-sm placeholder:text-ink-soft focus:outline-none"
        />
      </label>

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
            <EmptyState
              compacto
              mascote="lendo"
              titulo="Prateleira vazia"
              texto={
                busca
                  ? "Nenhum livro bate com essa busca. Tente outro título ou autor."
                  : readOnly
                    ? "Nenhum livro com esse status ainda. Troque o filtro acima."
                    : "Nenhum livro com esse status ainda. Troque o filtro acima ou adicione um livro novo."
              }
              acao={readOnly ? undefined : { href: "/books/new", label: "Adicionar livro" }}
            />
          ) : (
            <div className="grid grid-cols-3 gap-x-3 gap-y-6">
              {visiveis.map((b) => (
                <div key={b.id} className="flex flex-col gap-2">
                  <Link
                    href={`/books/${b.id}`}
                    aria-label={`Abrir ${b.title} — ${STATUS_META[b.status].label}`}
                    className="block"
                  >
                    <div className="relative aspect-[2/3] w-full">
                      <BookCover
                        item={{
                          title: b.title,
                          cover_kind: b.cover_kind,
                          cover_url: b.cover_url,
                          cover_palette: b.cover_palette,
                        }}
                      />
                      {/* Só em "lendo": % sobre a própria capa. Terminei/quero
                          ler não têm progresso que valha mostrar (100%/0%). */}
                      {b.status === "reading" && b.percent_lido != null && (
                        <div
                          className="absolute inset-x-0 bottom-0 flex h-4 items-center overflow-hidden bg-ink/75"
                          aria-hidden
                        >
                          <div
                            className="absolute inset-y-0 left-0 bg-moss"
                            style={{ width: `${b.percent_lido}%` }}
                          />
                          <span className="relative z-10 w-full text-center font-display text-[9px] text-paper">
                            {b.percent_lido}%
                          </span>
                        </div>
                      )}
                    </div>
                  </Link>
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <h4 className="line-clamp-1 font-display text-sm text-ink">{b.title}</h4>
                    {b.creator && (
                      <p className="line-clamp-1 font-serif text-[11px] italic text-ink-soft">
                        {b.creator}
                      </p>
                    )}
                    {/* Abandonei: sem barra na capa, mas o quanto já tinha ido
                        continua sendo uma informação útil aqui no texto. */}
                    {b.status === "abandoned" && b.percent_lido != null && (
                      <div className="flex items-center gap-1.5">
                        <span className="shrink-0 text-[9px] text-ink-soft">{b.percent_lido}% lido</span>
                        <div className="h-1 flex-1 overflow-hidden rounded-full bg-ink/10">
                          <div
                            className="h-full bg-ink-soft"
                            style={{ width: `${b.percent_lido}%` }}
                          />
                        </div>
                      </div>
                    )}
                    {readOnly ? (
                      <StarRating value={b.stars} size="sm" />
                    ) : (
                      <StarRating value={notas[b.id] ?? 0} onChange={(n) => onNota(b.id, n)} size="sm" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {restantes > 0 && (
            <button
              type="button"
              onClick={() => setVisivel((v) => v + INCREMENTO)}
              className="shadow-hard-sm mt-5 w-full rounded-md border-2 border-ink bg-paper py-2.5 font-display text-xs uppercase tracking-widest text-ink active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
            >
              Carregar mais {Math.min(INCREMENTO, restantes)}
            </button>
          )}
        </div>
        <div className="mt-3 h-3 rounded-sm border-2 border-ink bg-[#6D462A]" />
      </div>
    </main>
  );
}
