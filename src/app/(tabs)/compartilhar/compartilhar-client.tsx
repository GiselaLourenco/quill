"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { toPng } from "html-to-image";

/** Formato Stories/Reels — o que o Instagram espera. */
const LARGURA_STORY = 1080;
const ALTURA_STORY = 1920;
/** Largura em que o cartaz é desenhado antes de ser ampliado. */
const LARGURA_BASE = 384;

export type PeriodoStats = {
  id: string;
  rotulo: string;
  minutos: string;
  paginas: string;
  diasLidos: string;
  horaOuro: string;
  temDados: boolean;
};

export type LivroCartaz = {
  id: string;
  titulo: string;
  autor: string;
  nota: number | null;
};

export default function CompartilharClient({
  periodos,
  livros,
}: {
  periodos: PeriodoStats[];
  livros: LivroCartaz[];
}) {
  const [indice, setIndice] = useState(periodos.length - 1);
  const [livroId, setLivroId] = useState(livros[0]?.id ?? "");
  const [escolhendoLivro, setEscolhendoLivro] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const cartazRef = useRef<HTMLDivElement>(null);

  const periodo = periodos[indice]!;
  const livro = livros.find((l) => l.id === livroId);

  async function salvarImagem() {
    if (!cartazRef.current) return;
    setSalvando(true);
    setErro(null);
    try {
      const dataUrl = await toPng(cartazRef.current, {
        width: LARGURA_STORY,
        height: ALTURA_STORY,
        pixelRatio: 1,
        cacheBust: true,
      });

      // Web Share API com arquivo (celular): abre a bandeja nativa → Stories.
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `quill-${periodo.id}.png`, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `Quill · ${periodo.rotulo}` });
        return;
      }

      // Fallback (desktop): baixa o PNG.
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `quill-${periodo.id}.png`;
      a.click();
    } catch (e) {
      // Cancelar o compartilhamento nativo não é erro.
      if (e instanceof DOMException && e.name === "AbortError") return;
      setErro("Não deu pra gerar a imagem. Tenta de novo.");
    } finally {
      setSalvando(false);
    }
  }

  const [mes, ano] = periodo.rotulo.split(" ");

  return (
    <div className="flex-1 bg-paper px-5 pb-10 pt-6">
      {/* topo */}
      <header className="mb-5 flex items-center justify-between gap-3">
        <Link
          href="/"
          className="shadow-hard-sm rounded-md border-2 border-ink bg-card px-3 py-2 font-display text-[10px] uppercase tracking-widest text-ink"
        >
          ‹ Voltar
        </Link>
        <h1 className="font-display text-sm uppercase tracking-tight text-ink">
          Compartilhar metas
        </h1>
        <span className="w-[72px]" />
      </header>

      {/* seletor de período */}
      <div className="mb-5 flex items-center justify-between rounded-md border-2 border-ink bg-card px-2 py-2 shadow-hard-sm">
        <button
          type="button"
          aria-label="Período anterior"
          onClick={() => setIndice((i) => Math.max(0, i - 1))}
          disabled={indice === 0}
          className="px-3 py-1 font-display text-xl leading-none text-ink disabled:opacity-25"
        >
          ‹
        </button>
        <span className="font-display text-sm uppercase tracking-tight text-ink">
          {periodo.rotulo}
        </span>
        <button
          type="button"
          aria-label="Próximo período"
          onClick={() => setIndice((i) => Math.min(periodos.length - 1, i + 1))}
          disabled={indice === periodos.length - 1}
          className="px-3 py-1 font-display text-xl leading-none text-ink disabled:opacity-25"
        >
          ›
        </button>
      </div>

      {/* cartaz visível — responsivo */}
      <div className="shadow-hard mx-auto w-full max-w-sm overflow-hidden rounded-2xl border-2 border-ink">
        <Cartaz periodo={periodo} livro={livro} mes={mes} ano={ano} />
      </div>

      {/*
        Nó oculto em 1080×1920 (formato Stories), fora da tela: é ele que o
        html-to-image rasteriza. O cartaz é desenhado numa caixa de 384px e
        ampliado 2,8125× — assim o PNG sai na resolução que o Instagram espera,
        independente do tamanho da tela de quem está usando.
      */}
      <div aria-hidden className="pointer-events-none fixed left-[-20000px] top-0 h-0 overflow-hidden">
        <div ref={cartazRef} style={{ width: LARGURA_STORY, height: ALTURA_STORY }}>
          <div
            style={{
              width: LARGURA_BASE,
              height: LARGURA_BASE * (16 / 9),
              transform: `scale(${LARGURA_STORY / LARGURA_BASE})`,
              transformOrigin: "top left",
            }}
          >
            <Cartaz periodo={periodo} livro={livro} mes={mes} ano={ano} />
          </div>
        </div>
      </div>

      {!periodo.temDados && (
        <p className="mt-4 rounded-md border-2 border-dashed border-ink bg-card p-3 text-center font-serif text-sm italic text-ink-soft">
          Sem sessões registradas em {periodo.rotulo} — o cartaz sai zerado.
        </p>
      )}

      {/* escolher livro */}
      <div className="mt-5">
        <button
          type="button"
          onClick={() => setEscolhendoLivro((v) => !v)}
          disabled={livros.length === 0}
          aria-expanded={escolhendoLivro}
          className="shadow-hard-sm flex w-full items-center justify-between rounded-md border-2 border-ink bg-card px-4 py-3 disabled:opacity-50"
        >
          <span className="font-display text-[11px] uppercase tracking-widest text-ink">
            {livros.length === 0 ? "Nenhum livro na estante ainda" : "Escolher livro do período"}
          </span>
          <span className="font-display text-xs text-ink/60">{escolhendoLivro ? "▲" : "▼"}</span>
        </button>

        {escolhendoLivro && (
          <ul className="mt-3 space-y-2">
            {livros.map((l) => {
              const on = l.id === livroId;
              return (
                <li key={l.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setLivroId(l.id);
                      setEscolhendoLivro(false);
                    }}
                    aria-pressed={on}
                    className={`flex w-full items-center justify-between gap-3 rounded-md border-2 border-ink px-4 py-3 text-left transition-transform ${
                      on ? "shadow-hard-sm bg-mustard" : "bg-card hover:-translate-y-px"
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-serif text-sm font-bold italic text-ink">
                        {l.titulo}
                      </span>
                      <span className="block truncate text-[10px] font-semibold uppercase tracking-wide text-ink/60">
                        {l.autor}
                      </span>
                    </span>
                    {on && <span className="font-display text-[10px] uppercase text-ink">Escolhido</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {erro && <p className="mt-3 text-center text-sm font-medium text-coral">{erro}</p>}

      {/* salvar imagem */}
      <button
        type="button"
        onClick={salvarImagem}
        disabled={salvando}
        className="shadow-hard mt-6 flex w-full items-center justify-center gap-3 rounded-xl border-2 border-ink bg-coral py-4 text-paper transition-transform active:translate-x-1 active:translate-y-1 active:shadow-none disabled:opacity-60"
      >
        <span className="font-display text-xs uppercase tracking-widest">
          {salvando ? "Gerando…" : "Salvar imagem"}
        </span>
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      </button>
    </div>
  );
}

function Cartaz({
  periodo,
  livro,
  mes,
  ano,
}: {
  periodo: PeriodoStats;
  livro: LivroCartaz | undefined;
  mes: string | undefined;
  ano: string | undefined;
}) {
  return (
    <div className="relative aspect-[9/16] w-full overflow-hidden bg-navy p-5">
      {/* formas memphis */}
      <div className="pointer-events-none absolute -left-6 top-10 h-20 w-20 rounded-full border-2 border-mustard/60" />
      <div className="pointer-events-none absolute -right-3 top-40 h-10 w-10 rotate-12 border-2 border-ink bg-coral" />
      <div className="pointer-events-none absolute bottom-24 left-8 h-6 w-6 rounded-full border-2 border-ink bg-moss" />

      <div className="relative z-10 flex h-full flex-col items-center justify-between gap-3">
        <div className="text-center">
          <span className="font-display text-[10px] uppercase tracking-[0.25em] text-mustard">
            Retrospectiva
          </span>
          <h2 className="mt-1 text-center font-display text-3xl uppercase leading-none text-paper">
            {mes}
            <span className="mt-1 block font-serif text-base italic lowercase text-paper/70">
              {ano}
            </span>
          </h2>
        </div>

        {/* eslint-disable-next-line @next/next/no-img-element -- html-to-image precisa de <img> simples pra rasterizar */}
        <img
          src="/img/mascot/quill-escrevendo.webp"
          alt="Quill, o mascote, escrevendo no caderno"
          className="w-32 select-none"
          draggable={false}
        />

        {/* big numbers */}
        <div className="grid w-full grid-cols-2 gap-3">
          <BigNumber valor={periodo.minutos} rotulo="Minutos lidos" cor="text-coral" giro="-rotate-2" />
          <BigNumber valor={periodo.paginas} rotulo="Páginas" cor="text-moss" giro="rotate-2" />
          <BigNumber valor={periodo.diasLidos} rotulo="Dias lidos" cor="text-mustard" giro="rotate-1" />
          <BigNumber valor={periodo.horaOuro} rotulo="Horário de ouro" cor="text-navy" giro="-rotate-1" />
        </div>

        {/* livro do período */}
        <div className="shadow-hard w-full rounded-md border-2 border-ink bg-card p-4">
          <p className="font-display text-[10px] uppercase tracking-widest text-ink/60">
            Livro do período
          </p>
          {livro ? (
            <div className="mt-1 flex items-end justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-serif text-base font-bold italic text-ink">{livro.titulo}</p>
                <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-ink/60">
                  {livro.autor}
                </p>
              </div>
              {livro.nota ? (
                <span className="shrink-0 text-sm text-coral">{"★".repeat(livro.nota)}</span>
              ) : null}
            </div>
          ) : (
            <p className="mt-1 font-serif text-sm italic text-ink/60">Nenhum livro escolhido</p>
          )}
        </div>

        <p className="font-display text-[10px] uppercase tracking-[0.25em] text-paper/40">Quill</p>
      </div>
    </div>
  );
}

function BigNumber({
  valor,
  rotulo,
  cor,
  giro,
}: {
  valor: string;
  rotulo: string;
  cor: string;
  giro: string;
}) {
  return (
    <div className={`shadow-hard-sm rounded-md border-2 border-ink bg-card p-4 ${giro}`}>
      <p className={`font-display text-2xl leading-none ${cor}`}>{valor}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-tight text-ink/70">{rotulo}</p>
    </div>
  );
}
