"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { toPng } from "html-to-image";
import { ComSpinner } from "@/components/carregando";
import { Portal } from "@/components/portal";
import {
  MODELOS_CARTAZ,
  MODELOS_DESAFIO,
  MODELO_PADRAO,
  acharModelo,
  acharModeloDesafio,
  srcModelo,
  type ModeloCartaz,
} from "@/lib/compartilhar-modelos";
import { CartazIlustrado } from "./cartaz-ilustrado";
import { CartazDesafio, type DesafioCartaz } from "./cartaz-desafio";

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
  /** Livros com atualização de leitura no mês — ou, sem nenhum, os "terminei". */
  livros: LivroCartaz[];
  /** `livros` veio de atividade real no mês (true) ou do fallback "terminei" (false). */
  livrosDeAtividade: boolean;
  /** Os mesmos stats em número — os modelos ilustrados mostram "—" no lugar de zero. */
  numeros: { minutos: number; paginas: number; diasLidos: number };
  livrosTerminados: number;
  /** Média das estrelas dos livros terminados no mês (só os avaliados). */
  notaMedia: number | null;
  /** Média das notas dos livros terminados no ano até este mês. */
  notaMediaAno: number | null;
  /** Meta "livros no ano" como estava no fim do mês; null sem meta definida. */
  meta: { atual: number; alvo: number } | null;
  /** Maior sequência de dias seguidos dentro do mês. */
  maiorSequencia: number;
};

export type LivroCartaz = {
  id: string;
  titulo: string;
  autor: string;
  nota: number | null;
};

/**
 * Última escolha (modelo, aba), no localStorage — reabre a tela nela. Lida por
 * `useSyncExternalStore` (o servidor renderiza o padrão).
 */
function criarPreferencia(chave: string, padrao: string) {
  const ouvintes = new Set<() => void>();
  /** Fallback quando o storage falha — senão a troca não teria efeito. */
  let memoria: string | null = null;
  const assinar = (aviso: () => void) => {
    ouvintes.add(aviso);
    return () => {
      ouvintes.delete(aviso);
    };
  };
  const ler = () => {
    if (memoria != null) return memoria;
    try {
      return window.localStorage.getItem(chave) ?? padrao;
    } catch {
      return padrao;
    }
  };
  return {
    useValor: () => useSyncExternalStore(assinar, ler, () => padrao),
    salvar: (valor: string) => {
      try {
        window.localStorage.setItem(chave, valor);
      } catch {
        // Sem storage (aba anônima, bloqueado): vale só nesta visita.
      }
      memoria = valor;
      for (const aviso of ouvintes) aviso();
    },
  };
}

const prefModelo = criarPreferencia("quill:compartilhar:modelo", MODELO_PADRAO);
const prefModeloDesafio = criarPreferencia("quill:compartilhar:modelo-desafio", MODELOS_DESAFIO[0]!.id);
const prefAba = criarPreferencia("quill:compartilhar:aba", "mes");

/** Safari ou qualquer navegador no iPhone/iPad (todos usam o WebKit lá). */
function ehWebKit() {
  const ua = navigator.userAgent;
  const ios = /iP(hone|ad|od)/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const safari = /Safari/.test(ua) && !/Chrome|Chromium|CriOS|FxiOS|Edg|Android/.test(ua);
  return ios || safari;
}

/** Sem acento e sem caixa — "machado" acha "Machado de Assis". */
const normalizar = (t: string) =>
  t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

export default function CompartilharClient({
  periodos,
  todosLivros,
  desafios,
}: {
  periodos: PeriodoStats[];
  todosLivros: LivroCartaz[];
  desafios: DesafioCartaz[];
}) {
  const [indice, setIndice] = useState(periodos.length - 1);
  const periodo = periodos[indice]!;
  const [livroId, setLivroId] = useState(periodo.livros[0]?.id ?? todosLivros[0]?.id ?? "");
  const [escolhendoLivro, setEscolhendoLivro] = useState(false);
  const [buscaLivro, setBuscaLivro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const cartazRef = useRef<HTMLDivElement>(null);
  const [escolhendoModelo, setEscolhendoModelo] = useState(false);
  const [escolhendoDesafio, setEscolhendoDesafio] = useState(false);
  const modelo = acharModelo(prefModelo.useValor());
  const modeloDesafio = acharModeloDesafio(prefModeloDesafio.useValor());
  const noDesafio = prefAba.useValor() === "desafio";
  // Abre no desafio mais recente em andamento (a lista já vem nessa ordem).
  const [desafioId, setDesafioId] = useState(desafios[0]?.id ?? "");
  const desafio = desafios.find((d) => d.id === desafioId);

  // Trocar de período troca a lista sugerida — o livro escolhido some do
  // painel se não pertencer mais a ela, então volta pro 1º da nova lista.
  // Ajustado durante a renderização (mesmo padrão da estante): sem isto, o
  // cartaz piscaria com o livro do período anterior por um frame.
  const [indiceAnterior, setIndiceAnterior] = useState(indice);
  if (indice !== indiceAnterior) {
    setIndiceAnterior(indice);
    setLivroId(periodo.livros[0]?.id ?? todosLivros[0]?.id ?? "");
    setBuscaLivro("");
  }

  const livro = todosLivros.find((l) => l.id === livroId);

  const termoBusca = normalizar(buscaLivro);
  const resultadosBusca =
    termoBusca.length > 0
      ? todosLivros.filter(
          (l) => normalizar(l.titulo).includes(termoBusca) || normalizar(l.autor).includes(termoBusca),
        )
      : [];
  const listaPainel = termoBusca.length > 0 ? resultadosBusca : periodo.livros;

  // Safari: gera o PNG em segundo plano assim que o cartaz muda, pra
  // ilustração já estar "aquecida" quando a pessoa tocar em compartilhar.
  useEffect(() => {
    if (!ehWebKit()) return;
    let cancelado = false;
    const t = setTimeout(async () => {
      const no = cartazRef.current;
      if (!no) return;
      try {
        const imagens = [...no.querySelectorAll("img")];
        await Promise.all(imagens.map((img) => img.decode().catch(() => undefined)));
        for (let i = 0; i < 2 && !cancelado; i++) {
          await toPng(no, { width: LARGURA_STORY, height: ALTURA_STORY, pixelRatio: 1 });
        }
      } catch {
        // Aquecimento é só preparo; se falhar, o toque gera normalmente.
      }
    }, 600);
    return () => {
      cancelado = true;
      clearTimeout(t);
    };
  }, [modelo, modeloDesafio, periodo, livro, noDesafio, desafio]);

  async function salvarImagem() {
    if (!cartazRef.current) return;
    setSalvando(true);
    setErro(null);
    try {
      // A ilustração e as fontes precisam estar prontas, senão o PNG sai sem fundo.
      const imagens = [...cartazRef.current.querySelectorAll("img")];
      await Promise.all(imagens.map((img) => img.decode().catch(() => undefined)));
      await document.fonts?.ready;
      const opcoes = {
        width: LARGURA_STORY,
        height: ALTURA_STORY,
        pixelRatio: 1,
        cacheBust: true,
      };
      // Safari (e todo navegador no iPhone, que usa o motor dele): nas
      // primeiras passadas o html-to-image desenha o cartaz antes de a
      // ilustração de fundo estar decodificada dentro do SVG — o PNG sai só
      // com textos e números, sem a arte do Quill. No Chrome/Android isso não
      // acontece, então lá continua uma passada só.
      // O "aquecimento" (efeito abaixo) já fez as passadas iniciais em
      // segundo plano; aqui basta mais uma e ficar com a maior (a que tem a
      // arte). Poucas passadas no toque porque o Safari só deixa abrir a
      // bandeja de compartilhar logo depois do toque.
      let dataUrl = await toPng(cartazRef.current, opcoes);
      if (ehWebKit()) {
        const nova = await toPng(cartazRef.current, opcoes);
        if (nova.length > dataUrl.length) dataUrl = nova;
      }

      // Web Share API com arquivo (celular): abre a bandeja nativa → Stories.
      const blob = await (await fetch(dataUrl)).blob();
      const nomeArquivo = noDesafio && desafio ? `quill-desafio-${desafio.id.slice(0, 8)}.png` : `quill-${periodo.id}.png`;
      const file = new File([blob], nomeArquivo, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `Quill · ${noDesafio && desafio ? desafio.nome : periodo.rotulo}` });
        return;
      }

      // Fallback (desktop): baixa o PNG.
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = nomeArquivo;
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
      {/* Mesmo cabeçalho da tela do livro: quadrado só com o chevron e título
          à esquerda. O botão anterior tinha a palavra "Voltar" em
          `tracking-widest` dentro de um `justify-between` — espremido entre o
          título e o espaçador, ele quebrava em duas linhas. */}
      <header className="mb-5 flex items-center gap-3">
        <Link
          href="/"
          aria-label="Voltar para a home"
          className="shadow-hard-sm flex h-9 w-9 shrink-0 items-center justify-center rounded-md border-2 border-ink bg-card font-display text-lg leading-none text-ink active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
        >
          ‹
        </Link>
        <h1 className="font-display text-lg uppercase leading-none tracking-tight text-ink">
          Compartilhar
        </h1>
        <button
          type="button"
          onClick={() => setEscolhendoModelo(true)}
          aria-haspopup="dialog"
          className="shadow-hard-sm ml-auto flex h-9 shrink-0 items-center gap-1.5 rounded-md border-2 border-ink bg-mustard px-2.5 text-xs font-bold text-ink active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
        >
          {/* camadas */}
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M12 3 2 8l10 5 10-5-10-5z" />
            <path d="m2 13 10 5 10-5" />
            <path d="m2 17.5 10 5 10-5" />
          </svg>
          Modelo
        </button>
      </header>

      {escolhendoModelo && (
        <SheetModelos
          modelos={noDesafio ? MODELOS_DESAFIO : MODELOS_CARTAZ}
          atual={noDesafio ? modeloDesafio.id : modelo.id}
          onEscolher={(id) => {
            (noDesafio ? prefModeloDesafio : prefModelo).salvar(id);
            setEscolhendoModelo(false);
          }}
          onFechar={() => setEscolhendoModelo(false)}
          periodo={periodo}
          livro={livro}
          mes={mes}
          ano={ano}
        />
      )}

      {escolhendoDesafio && (
        <SheetDesafios
          desafios={desafios}
          atual={desafioId}
          onEscolher={(id) => {
            setDesafioId(id);
            setEscolhendoDesafio(false);
          }}
          onFechar={() => setEscolhendoDesafio(false)}
        />
      )}

      {/* Meu mês | Desafio */}
      <div className="shadow-hard-sm mb-4 grid grid-cols-2 overflow-hidden rounded-md border-2 border-ink" role="group" aria-label="O que compartilhar">
        {(["mes", "desafio"] as const).map((aba) => {
          const on = (aba === "desafio") === noDesafio;
          return (
            <button
              key={aba}
              type="button"
              onClick={() => prefAba.salvar(aba)}
              aria-pressed={on}
              className={`py-2.5 font-display text-[11px] uppercase tracking-widest ${on ? "bg-ink text-paper" : "bg-card text-ink"}`}
            >
              {aba === "mes" ? "Meu mês" : "Desafio"}
            </button>
          );
        })}
      </div>

      {noDesafio ? (
        desafio ? (
          <>
            <button
              type="button"
              onClick={() => setEscolhendoDesafio(true)}
              aria-haspopup="dialog"
              className="shadow-hard-sm mb-5 flex w-full items-center gap-3 rounded-md border-2 border-ink bg-card px-4 py-2.5 text-left"
            >
              <span className="min-w-0 flex-1">
                <span className="block font-display text-[9px] uppercase tracking-[0.2em] text-ink-soft">Desafio</span>
                <span className="block truncate font-serif text-base font-semibold italic text-ink">{desafio.nome}</span>
                <span className="block truncate text-[11px] text-ink-soft">{resumoDesafio(desafio)}</span>
              </span>
              <span className="font-display text-xs text-ink-soft" aria-hidden>▾</span>
            </button>
            <div className="shadow-hard mx-auto w-full max-w-sm overflow-hidden rounded-2xl border-2 border-ink">
              <div key={`${modeloDesafio.id}:${desafio.id}`} className="animate-cartaz-entra">
                <CartazDesafio modelo={modeloDesafio} desafio={desafio} />
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-md border-2 border-dashed border-ink bg-card p-5 text-center">
            <p className="font-serif text-sm italic text-ink-soft">Você ainda não está em nenhum desafio.</p>
            <Link
              href="/juntos/novo"
              className="shadow-hard-sm mt-3 inline-block rounded-md border-2 border-ink bg-mustard px-4 py-2 font-display text-[11px] uppercase tracking-widest text-ink"
            >
              Criar um desafio
            </Link>
          </div>
        )
      ) : (
      <>
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
        {/* `key` remonta na troca: a entrada curta roda de novo e o esqueleto volta até a nova imagem carregar. */}
        <div key={modelo.id} className="animate-cartaz-entra">
          <CartazDoModelo modelo={modelo} periodo={periodo} livro={livro} mes={mes} ano={ano} />
        </div>
      </div>
      </>
      )}

      {/*
        Nó oculto em 1080×1920 (formato Stories), fora da tela: é ele que o
        html-to-image rasteriza. O cartaz é desenhado numa caixa de 384px e
        ampliado 2,8125× — assim o PNG sai na resolução que o Instagram espera,
        independente do tamanho da tela de quem está usando.
      */}
      <div aria-hidden className="pointer-events-none fixed left-[-20000px] top-0 h-0 overflow-hidden">
        <div ref={cartazRef} style={{ width: LARGURA_STORY, height: ALTURA_STORY }}>
          {noDesafio ? (
            desafio && <CartazDesafio modelo={modeloDesafio} desafio={desafio} />
          ) : modelo.tipo === "ilustrado" ? (
            // Fontes em `cqw`: desenhado direto em 1080 de largura, sem ampliar.
            <CartazIlustrado modelo={modelo} periodo={periodo} livro={livro} mes={mes} ano={ano} />
          ) : (
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
          )}
        </div>
      </div>

      {!noDesafio && !periodo.temDados && (
        <p className="mt-4 rounded-md border-2 border-dashed border-ink bg-card p-3 text-center font-serif text-sm italic text-ink-soft">
          Sem sessões registradas em {periodo.rotulo} — o cartaz sai zerado.
        </p>
      )}

      {/* escolher livro */}
      {!noDesafio && (
      <div className="mt-5">
        <button
          type="button"
          onClick={() => setEscolhendoLivro((v) => !v)}
          disabled={todosLivros.length === 0}
          aria-expanded={escolhendoLivro}
          className="shadow-hard-sm flex w-full items-center justify-between rounded-md border-2 border-ink bg-card px-4 py-3 disabled:opacity-50"
        >
          <span className="font-display text-[11px] uppercase tracking-widest text-ink">
            {todosLivros.length === 0 ? "Nenhum livro na estante ainda" : "Escolher livro do período"}
          </span>
          <span className="font-display text-xs text-ink/60">{escolhendoLivro ? "▲" : "▼"}</span>
        </button>

        {escolhendoLivro && (
          <>
            <label className="relative mt-3 block">
              <span className="sr-only">Buscar livro na estante</span>
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
                value={buscaLivro}
                onChange={(e) => setBuscaLivro(e.target.value)}
                placeholder="Buscar qualquer livro da estante"
                className="w-full rounded-md border-2 border-ink bg-paper py-2 pl-9 pr-3 text-sm shadow-hard-sm placeholder:text-ink-soft focus:outline-none"
              />
            </label>

            {termoBusca.length === 0 && periodo.livros.length > 0 && (
              <p className="mt-2 text-[11px] text-ink-soft">
                {periodo.livrosDeAtividade
                  ? `Livros com leitura registrada em ${periodo.rotulo}`
                  : `Sem leitura registrada em ${periodo.rotulo} — mostrando os "terminei"`}
              </p>
            )}
          </>
        )}

        {escolhendoLivro && (
          <ul className="mt-3 space-y-2">
            {listaPainel.length === 0 && (
              <li className="rounded-md border-2 border-dashed border-ink/40 p-3 text-center font-serif text-sm italic text-ink-soft">
                Nenhum livro bate com essa busca.
              </li>
            )}
            {listaPainel.map((l) => {
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
      )}

      {erro && <p className="mt-3 text-center text-sm font-medium text-coral">{erro}</p>}

      {/* salvar imagem */}
      <button
        type="button"
        onClick={salvarImagem}
        disabled={salvando || (noDesafio && !desafio)}
        className="shadow-hard mt-6 flex w-full items-center justify-center gap-3 rounded-xl border-2 border-ink bg-coral py-4 text-paper transition-transform active:translate-x-1 active:translate-y-1 active:shadow-none disabled:opacity-60"
      >
        <span className="font-display text-xs uppercase tracking-widest">
          <ComSpinner ocupado={salvando}>{salvando ? "Gerando…" : "Salvar imagem"}</ComSpinner>
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

function CartazDoModelo({
  modelo,
  ...dados
}: {
  modelo: ModeloCartaz;
  periodo: PeriodoStats;
  livro: LivroCartaz | undefined;
  mes: string | undefined;
  ano: string | undefined;
}) {
  return modelo.tipo === "ilustrado" ? <CartazIlustrado modelo={modelo} {...dados} /> : <Cartaz {...dados} />;
}

/** "5 pessoas · ranking por páginas · faltam 25 dias" */
function resumoDesafio(d: DesafioCartaz): string {
  const pessoas = d.pessoas === 1 ? "1 pessoa" : `${d.pessoas} pessoas`;
  return `${pessoas} · ${d.metricaRotulo.toLowerCase()} · ${d.restam}`;
}

/** Bottom sheet "Escolher desafio": em andamento em cima, encerrados embaixo. */
function SheetDesafios({
  desafios,
  atual,
  onEscolher,
  onFechar,
}: {
  desafios: DesafioCartaz[];
  atual: string;
  onEscolher: (id: string) => void;
  onFechar: () => void;
}) {
  const grupos = [
    { titulo: "Em andamento", itens: desafios.filter((d) => !d.encerrado) },
    { titulo: "Encerrados", itens: desafios.filter((d) => d.encerrado) },
  ].filter((g) => g.itens.length > 0);
  return (
    <Portal>
      <div className="fixed inset-0 z-40 flex justify-center" role="dialog" aria-modal="true" aria-label="Escolher desafio">
        <button type="button" aria-label="Fechar" onClick={onFechar} className="absolute inset-0 bg-ink/40" />
        <div className="shadow-hard relative mt-auto max-h-[80dvh] w-full max-w-[390px] overflow-y-auto border-x-2 border-t-2 border-ink bg-paper p-5 pb-8">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h2 className="font-display text-lg uppercase leading-none tracking-tight text-ink">Escolher desafio</h2>
            <button
              type="button"
              onClick={onFechar}
              aria-label="Fechar"
              className="shadow-hard-sm flex h-8 w-8 items-center justify-center border-2 border-ink bg-card font-display text-sm text-ink active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
            >
              ✕
            </button>
          </div>
          {grupos.map((g) => (
            <section key={g.titulo}>
              <h3 className="mb-2 mt-4 font-display text-[10px] uppercase tracking-[0.2em] text-ink-soft">{g.titulo}</h3>
              <ul className="space-y-2">
                {g.itens.map((d) => {
                  const on = d.id === atual;
                  return (
                    <li key={d.id}>
                      <button
                        type="button"
                        onClick={() => onEscolher(d.id)}
                        aria-pressed={on}
                        className={`shadow-hard-sm flex w-full items-center gap-3 rounded-md border-2 border-ink px-4 py-2.5 text-left active:translate-x-[1px] active:translate-y-[1px] active:shadow-none ${
                          on ? "bg-mustard" : "bg-card"
                        }`}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block font-serif text-[15px] font-semibold italic text-ink">{d.nome}</span>
                          <span className="block text-[11px] text-ink/75">{resumoDesafio(d)}</span>
                        </span>
                        {on && <span className="font-display text-sm text-ink">✓</span>}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </Portal>
  );
}

/** Bottom sheet "Escolher modelo": grade 2 colunas de miniaturas 9:16. */
function SheetModelos({
  modelos,
  atual,
  onEscolher,
  onFechar,
  ...dados
}: {
  modelos: readonly { id: string; nome: string; tipo: string }[];
  atual: string;
  onEscolher: (id: string) => void;
  onFechar: () => void;
  periodo: PeriodoStats;
  livro: LivroCartaz | undefined;
  mes: string | undefined;
  ano: string | undefined;
}) {
  return (
    <Portal>
      <div className="fixed inset-0 z-40 flex justify-center" role="dialog" aria-modal="true" aria-label="Escolher modelo">
        <button type="button" aria-label="Fechar" onClick={onFechar} className="absolute inset-0 bg-ink/40" />
        <div className="shadow-hard relative mt-auto max-h-[85dvh] w-full max-w-[390px] overflow-y-auto border-x-2 border-t-2 border-ink bg-paper p-5 pb-8">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-display text-lg uppercase leading-none tracking-tight text-ink">Escolher modelo</h2>
            <button
              type="button"
              onClick={onFechar}
              aria-label="Fechar"
              className="shadow-hard-sm flex h-8 w-8 items-center justify-center border-2 border-ink bg-card font-display text-sm text-ink active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
            >
              ✕
            </button>
          </div>

          <ul className="grid grid-cols-2 gap-3">
            {modelos.map((m) => {
              const on = m.id === atual;
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => onEscolher(m.id)}
                    aria-pressed={on}
                    className="block w-full text-left"
                  >
                    <span
                      className={`relative block aspect-[9/16] overflow-hidden rounded-lg border-2 border-ink ${
                        on ? "shadow-hard ring-4 ring-mustard" : "shadow-hard-sm"
                      }`}
                    >
                      {m.tipo !== "classico" ? (
                        // eslint-disable-next-line @next/next/no-img-element -- miniatura da mesma imagem do cartaz; já fica no cache pra troca
                        <img src={srcModelo(m.id)} alt="" loading="lazy" className="h-full w-full object-cover" />
                      ) : (
                        <MiniaturaClassico {...dados} />
                      )}
                      {on && (
                        <span className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-ink bg-mustard font-display text-xs text-ink">
                          ✓
                        </span>
                      )}
                    </span>
                    <span className="mt-1.5 block truncate text-center font-display text-[10px] uppercase tracking-wider text-ink">
                      {m.nome}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </Portal>
  );
}

/** O clássico é desenhado em 384px; aqui ele é reduzido pra caber na célula. */
function MiniaturaClassico(dados: {
  periodo: PeriodoStats;
  livro: LivroCartaz | undefined;
  mes: string | undefined;
  ano: string | undefined;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [escala, setEscala] = useState(0.4);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const medir = () => setEscala(el.clientWidth / LARGURA_BASE);
    medir();
    const obs = new ResizeObserver(medir);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <span ref={ref} className="pointer-events-none block h-full w-full" aria-hidden>
      <span
        className="block"
        style={{ width: LARGURA_BASE, transform: `scale(${escala})`, transformOrigin: "top left" }}
      >
        <Cartaz {...dados} />
      </span>
    </span>
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
