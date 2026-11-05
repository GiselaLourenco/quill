"use client";

import { AppImage } from "@/components/app-image";
import {
  minutosDoValor,
  valorNaUnidade,
  type UnidadeTempo,
} from "@/lib/tempo";
import { BookThumb } from "@/components/book-thumb";
import { BookCover, type CoverFields } from "@/components/book-cover";
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import {
  createSession,
  publishSession,
  saveSessionMemory,
  type SessionUnit,
} from "@/app/actions/sessions";
import { atualizarCampoLivro, iniciarReleitura, updateItemStatus } from "@/app/actions/media-items";
import {
  CampoPosicao,
  ESTADO_POSICAO_VAZIO,
  type EstadoPosicao,
  type UnidadeCampo,
} from "@/components/campo-posicao";
import { percentualDaPagina } from "@/lib/posicao";
import type { ActiveChallenge } from "@/lib/challenges";
import { ComSpinner } from "@/components/carregando";

export type BookOption = CoverFields & {
  id: string;
  author: string;
  status: string;
  /** Posição registrada mais recente; null = o livro nunca teve. */
  paginaAtual: number | null;
  capituloAtual: number | null;
  /** % digitado na sessão mais recente em páginas; null = ela não foi em %. */
  percentualAtual?: number | null;
  totalPaginas: number | null;
  totalCapitulos: number | null;
  /** A sessão mais recente do livro foi em capítulos — a tela volta a abrir em Caps. */
  ultimaEmCapitulos?: boolean;
};

/** Capítulo estimado pela página (pág. 48 de 686 num livro de 38 caps → cap. 3). */
const capituloDaPagina = (pagina: number, totalPaginas: number, totalCapitulos: number) =>
  Math.min(totalCapitulos, Math.round((pagina / totalPaginas) * totalCapitulos));

/** Página estimada pelo capítulo — a conta inversa da de cima. */
const paginaDoCapitulo = (cap: number, totalPaginas: number, totalCapitulos: number) =>
  Math.min(totalPaginas, Math.round((cap / totalCapitulos) * totalPaginas));

/**
 * Abre na última unidade usada nesse livro: % se a sessão mais recente foi em
 * %; capítulos se o livro só tem capítulos; senão páginas.
 */
const unidadeDoLivro = (l: BookOption | null): UnidadeCampo =>
  l && l.ultimaEmCapitulos && l.capituloAtual != null
    ? "chapters"
    : l && l.percentualAtual != null && l.totalPaginas
    ? "percent"
    : l && l.paginaAtual == null && l.capituloAtual != null
      ? "chapters"
      : "pages";

const TAG_OPTIONS: { value: string; label: string; positiva: boolean }[] = [
  { value: "flowed", label: "a leitura fluiu", positiva: true },
  { value: "no_distractions", label: "li sem distrações", positiva: true },
  { value: "phone", label: "parei p/ olhar o celular", positiva: false },
  { value: "hard", label: "foi difícil", positiva: false },
];

// Quatro atalhos porque a grade da tela é de quatro colunas. Em horas os
// passos são inteiros: quem pensa "li duas horas" não quer marcar 120.
const PRESETS_MIN = [15, 30, 45, 60];
const PRESETS_H = [1, 2, 3, 4];

function metricLabel(metric: string): string {
  switch (metric) {
    case "pages":
      return "páginas";
    case "chapters":
      return "capítulos";
    case "active_days":
      return "dias com leitura";
    case "check_ins":
      return "check-ins";
    case "minutes":
      return "minutos";
    default:
      return metric;
  }
}

type Fase = "idle" | "rodando" | "registro" | "salvo";

const CHAVE_SESSAO = "quill.sessao-em-andamento";
// A demo (/ler/demo) guarda o timer em outra chave pra não misturar com uma
// sessão de verdade em andamento.
const CHAVE_SESSAO_DEMO = "quill.sessao-em-andamento.demo";

type SessaoSalva = {
  fase: "rodando" | "registro";
  startedAt: string | null;
  runStartMs: number | null;
  accSeconds: number;
  pausado: boolean;
  minutosSessao: number;
  notas?: NotaSessao[];
  /** Formato antigo (uma nota só) — lido pra não perder sessão em andamento. */
  notaRascunho?: string;
  notaRascunhoPublica?: boolean;
};

/** Nota escrita com o timer rodando ("+ Nota"). Vira comentário no registro. */
type NotaSessao = { id: string; texto: string; publica: boolean };

function novaNotaId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function notasDaSessaoSalva(s: SessaoSalva): NotaSessao[] {
  if (Array.isArray(s.notas)) return s.notas;
  if (s.notaRascunho?.trim()) {
    return [{ id: novaNotaId(), texto: s.notaRascunho, publica: !!s.notaRascunhoPublica }];
  }
  return [];
}

function lerSessaoSalva(chave: string): SessaoSalva | null {
  try {
    const bruto = window.localStorage.getItem(chave);
    if (!bruto) return null;
    const s = JSON.parse(bruto) as SessaoSalva;
    if (s.fase !== "rodando" && s.fase !== "registro") return null;
    return s;
  } catch {
    return null;
  }
}

function gravarSessao(chave: string, s: SessaoSalva) {
  try {
    window.localStorage.setItem(chave, JSON.stringify(s));
  } catch {
    // sem storage (aba anônima etc.): o timer só não sobrevive à troca de aba
  }
}

function limparSessao(chave: string) {
  try {
    window.localStorage.removeItem(chave);
  } catch {}
}

export function FreeReadingSession({
  books,
  activeChallenges,
  demo = false,
}: {
  books: BookOption[];
  activeChallenges: ActiveChallenge[];
  /** /ler/demo: nada é gravado no banco. */
  demo?: boolean;
}) {
  const chaveSessao = demo ? CHAVE_SESSAO_DEMO : CHAVE_SESSAO;
  const [fase, setFase] = useState<Fase>("idle");
  const [startedAt, setStartedAt] = useState<string | null>(null);
  // Timestamp (ms) de quando o período de running atual começou
  const [runStartMs, setRunStartMs] = useState<number | null>(null);
  // Segundos acumulados de períodos anteriores (antes de cada pausa)
  const [accSeconds, setAccSeconds] = useState(0);
  const [pausado, setPausado] = useState(false);
  // Segundos exibidos — sempre derivados de timestamps reais (ver efeito abaixo)
  const [elapsed, setElapsed] = useState(0);
  const [minutosSessao, setMinutosSessao] = useState(30);
  const [origem, setOrigem] = useState<"timer" | "manual">("manual");
  const [resumo, setResumo] = useState<{ minutos: number; titulo: string; quantidade: number; unidade: SessionUnit } | null>(null);
  // Nota escrita com o timer rodando (botão "+ Nota") — fica guardada aqui
  // até a tela de registro, onde o livro é escolhido e ela vira comentário
  // de verdade junto com o resto da sessão.
  const [notas, setNotas] = useState<NotaSessao[]>([]);

  const rodando = fase === "rodando" && !pausado;

  // A sessão em andamento fica no localStorage: trocar de aba desmonta este
  // componente, e sem isso o timer voltava pro play. Só restaura no cliente
  // (depois do mount) pra não brigar com o HTML do servidor.
  const [restaurado, setRestaurado] = useState(false);
  useEffect(() => {
    const salva = lerSessaoSalva(chaveSessao);
    if (salva) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStartedAt(salva.startedAt);
      setAccSeconds(salva.accSeconds);
      setRunStartMs(salva.runStartMs);
      setPausado(salva.pausado);
      setElapsed(
        salva.accSeconds +
          (salva.runStartMs != null && !salva.pausado
            ? Math.floor((Date.now() - salva.runStartMs) / 1000)
            : 0),
      );
      setNotas(notasDaSessaoSalva(salva));
      if (salva.fase === "registro") {
        setMinutosSessao(salva.minutosSessao);
        setOrigem("timer");
      }
      setFase(salva.fase);
    }
    setRestaurado(true);
  }, [chaveSessao]);

  useEffect(() => {
    if (!restaurado) return;
    if (fase === "rodando" || (fase === "registro" && origem === "timer")) {
      gravarSessao(chaveSessao, {
        fase,
        startedAt,
        runStartMs,
        accSeconds,
        pausado,
        minutosSessao,
        notas,
      });
    } else {
      limparSessao(chaveSessao);
    }
  }, [
    chaveSessao,
    restaurado,
    fase,
    origem,
    startedAt,
    runStartMs,
    accSeconds,
    pausado,
    minutosSessao,
    notas,
  ]);

  // O tempo decorrido NUNCA é contado somando ticks: ele é sempre recalculado a
  // partir do timestamp de início. Assim o timer continua certo mesmo quando o
  // navegador congela o setInterval em background (aba oculta, tela bloqueada).
  useEffect(() => {
    if (!rodando || runStartMs == null) return;
    const sincronizar = () =>
      setElapsed(accSeconds + Math.floor((Date.now() - runStartMs) / 1000));
    const id = setInterval(sincronizar, 1000);
    // ao voltar do background, ressincroniza na hora em vez de esperar o tick
    document.addEventListener("visibilitychange", sincronizar);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", sincronizar);
    };
  }, [rodando, runStartMs, accSeconds]);

  // Valor exato agora — para pausar/encerrar sem depender do último tick.
  function segundosAgora() {
    return !pausado && runStartMs != null
      ? accSeconds + Math.floor((Date.now() - runStartMs) / 1000)
      : accSeconds;
  }

  function iniciar() {
    setStartedAt(new Date().toISOString());
    setAccSeconds(0);
    setElapsed(0);
    setRunStartMs(Date.now());
    setPausado(false);
    setNotas([]);
    setFase("rodando");
  }

  function alternarPausa() {
    if (pausado) {
      // Retomar: novo marco de tempo, o acumulado já está congelado
      setRunStartMs(Date.now());
      setPausado(false);
      return;
    }
    // Pausar: congela os segundos acumulados até agora
    const atual = segundosAgora();
    setAccSeconds(atual);
    setElapsed(atual);
    setRunStartMs(null);
    setPausado(true);
  }

  function encerrar() {
    const atual = segundosAgora();
    setAccSeconds(atual);
    setElapsed(atual);
    setRunStartMs(null);
    setPausado(false);
    setMinutosSessao(Math.max(1, Math.round(atual / 60)));
    setOrigem("timer");
    setFase("registro");
  }

  function abrirManual() {
    setStartedAt(new Date().toISOString());
    setMinutosSessao(30);
    setOrigem("manual");
    setFase("registro");
  }

  function voltarAoInicio() {
    setFase("idle");
    setAccSeconds(0);
    setElapsed(0);
    setRunStartMs(null);
    setPausado(false);
    setStartedAt(null);
    setResumo(null);
    setNotas([]);
  }

  if (fase === "salvo" && resumo) {
    return <TelaSalvo resumo={resumo} onVoltar={voltarAoInicio} />;
  }

  if (fase === "registro") {
    return (
      <TelaRegistro
        key={`${origem}-${minutosSessao}`}
        books={books}
        activeChallenges={activeChallenges}
        demo={demo}
        minutosIniciais={minutosSessao}
        origem={origem}
        startedAt={startedAt ?? new Date().toISOString()}
        notasIniciais={notas}
        onVoltar={voltarAoInicio}
        onSalvo={(r) => {
          setResumo(r);
          setFase("salvo");
        }}
      />
    );
  }

  if (fase === "rodando") {
    return (
      <TelaRodando
        segundos={elapsed}
        pausado={pausado}
        onPausar={alternarPausa}
        onEncerrar={encerrar}
        notas={notas}
        onAdicionarNota={(texto, publica) =>
          setNotas((n) => [...n, { id: novaNotaId(), texto, publica }])
        }
        onRemoverNota={(id) => setNotas((n) => n.filter((x) => x.id !== id))}
      />
    );
  }

  return <TelaIdle onIniciar={iniciar} onManual={abrirManual} />;
}

/* ------------------------------------------------------------------ */
/*  Tela idle                                                          */
/* ------------------------------------------------------------------ */

function CenaQuill({ src, alt, badge }: { src: string; alt: string; badge?: string }) {
  return (
    <div className="relative">
      <div className="shadow-hard relative flex aspect-square w-[min(18rem,78vw)] items-center justify-center overflow-hidden rounded-full border-2 border-ink bg-moss">
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-ink/10" />
        <span className="absolute left-8 top-6 font-display text-xl text-paper" aria-hidden>✦</span>
        <span className="absolute right-10 top-10 font-display text-sm text-paper/80" aria-hidden>✦</span>
        <span className="absolute bottom-16 right-6 font-display text-lg text-paper/70" aria-hidden>✦</span>
        {/* O mascote é centralizado: os webp são 512×288 (largos), então
            ancorar embaixo jogava a arte pro rodapé do círculo. */}
        <AppImage
          slot="ler.cena"
          src={src}
          alt={alt}
          width={320}
          height={320}
          priority
          className="relative w-[86%] object-contain drop-shadow-[3px_3px_0_rgba(0,0,0,0.35)]"
        />
      </div>
      {badge && (
        <span className="shadow-hard-sm absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border-2 border-ink bg-mustard px-3 py-1 font-display text-xs tracking-wide">
          {badge}
        </span>
      )}
    </div>
  );
}

function TelaIdle({ onIniciar, onManual }: { onIniciar: () => void; onManual: () => void }) {
  return (
    <div className="px-5 pb-8 pt-6">
      <h1 className="font-display text-3xl uppercase leading-none tracking-tight text-ink">
        Sessão de leitura
      </h1>
      <p className="mt-1 text-sm text-ink-soft">Um botão. Um tempo pra você e o livro.</p>

      <div className="mt-8 flex justify-center">
        <CenaQuill
          src="/img/mascot/quill-lendo.webp"
          alt="Quill lendo tranquilo"
          badge="pronto pra ler?"
        />
      </div>

      <div className="mt-8 flex flex-col items-center">
        <button
          type="button"
          onClick={onIniciar}
          aria-label="Começar sessão de leitura"
          className="shadow-hard flex h-24 w-24 items-center justify-center rounded-full border-2 border-ink bg-coral text-paper transition active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
        >
          <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M8 5.5v13a1 1 0 0 0 1.55.83l10-6.5a1 1 0 0 0 0-1.66l-10-6.5A1 1 0 0 0 8 5.5Z" />
          </svg>
        </button>
        <p className="mt-3 font-display text-base tracking-wide">COMEÇAR</p>

        <button
          type="button"
          onClick={onManual}
          className="mt-5 text-sm font-medium text-moss-dark underline underline-offset-4"
        >
          Leu sem o timer? Registrar manualmente
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tela sessão rodando                                                */
/* ------------------------------------------------------------------ */

function TelaRodando({
  segundos,
  pausado,
  onPausar,
  onEncerrar,
  notas,
  onAdicionarNota,
  onRemoverNota,
}: {
  segundos: number;
  pausado: boolean;
  onPausar: () => void;
  onEncerrar: () => void;
  notas: NotaSessao[];
  onAdicionarNota: (texto: string, publica: boolean) => void;
  onRemoverNota: (id: string) => void;
}) {
  const [notaAberta, setNotaAberta] = useState(false);
  const h = Math.floor(segundos / 3600);
  const m = Math.floor((segundos % 3600) / 60);
  const s = segundos % 60;
  const label =
    h > 0
      ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
      : `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;

  const mascote =
    segundos >= 60 * 25 ? "/img/mascot/quill-timer-completo.webp" : "/img/mascot/quill-lendo.webp";

  return (
    <div className="px-5 pb-8 pt-6">
      <h1 className="font-display text-3xl uppercase leading-none tracking-tight text-ink">
        Sessão de leitura
      </h1>

      <div className="mt-5 flex justify-center">
        <CenaQuill src={mascote} alt="Quill lendo" badge={pausado ? "pausado" : undefined} />
      </div>

      <div className="mt-8 text-center">
        <div className="font-display text-6xl tabular-nums tracking-tight" aria-live="polite">
          {label}
        </div>
        <p className="mt-2 text-xs text-ink-soft">
          O timer nunca trava o app — pode navegar à vontade.
        </p>
      </div>

      <div className="mt-8 flex gap-3">
        <button
          type="button"
          onClick={onPausar}
          className="shadow-hard h-14 flex-1 rounded-xl border-2 border-ink bg-paper font-display tracking-wide text-ink active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
        >
          {pausado ? "▶ Retomar" : "II Pausar"}
        </button>
        <button
          type="button"
          onClick={onEncerrar}
          className="shadow-hard h-14 flex-1 rounded-xl border-2 border-ink bg-coral font-display tracking-wide text-paper active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
        >
          ■ Encerrar
        </button>
      </div>

      <button
        type="button"
        onClick={() => setNotaAberta(true)}
        className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-navy font-display text-xs tracking-wide text-navy"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
          <path d="M12 5v14M5 12h14" />
        </svg>
        + NOTA
        {notas.length > 0 && (
          <span
            className="ml-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-coral px-1.5 text-[10px] text-paper"
            aria-label={`${notas.length} ${notas.length === 1 ? "nota salva" : "notas salvas"}`}
          >
            {notas.length}
          </span>
        )}
      </button>

      {notaAberta && (
        <ModalNotaSessao
          segundos={segundos}
          notas={notas}
          onFechar={() => setNotaAberta(false)}
          onSalvar={onAdicionarNota}
          onRemover={onRemoverNota}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Modal "+ Nota" — escrever com o timer rodando, sem pausar           */
/* ------------------------------------------------------------------ */

function ModalNotaSessao({
  segundos,
  notas,
  onFechar,
  onSalvar,
  onRemover,
}: {
  segundos: number;
  notas: NotaSessao[];
  onFechar: () => void;
  onSalvar: (texto: string, publica: boolean) => void;
  onRemover: (id: string) => void;
}) {
  // Salvar não fecha: a nota desce pra lista e a caixa zera pra próxima.
  // A visibilidade fica como estava — quem marcou "amigos" costuma seguir assim.
  const [texto, setTexto] = useState("");
  const [publica, setPublica] = useState(notas[notas.length - 1]?.publica ?? false);
  const campo = useRef<HTMLTextAreaElement>(null);
  const m = Math.floor(segundos / 60);
  const s = segundos % 60;
  const vazio = !texto.trim();

  function salvar() {
    if (vazio) return;
    onSalvar(texto.trim(), publica);
    setTexto("");
    campo.current?.focus();
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-ink/55" role="dialog" aria-modal="true" aria-label="Adicionar nota">
      <div className="max-h-[90dvh] w-full max-w-[390px] overflow-y-auto rounded-t-2xl border-2 border-ink bg-paper p-5 pb-7">
        <div className="mb-1 flex items-center justify-between">
          <span className="font-display text-[10px] uppercase tracking-widest text-ink-soft">
            sessão continua rodando — {String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
          </span>
          <button
            type="button"
            onClick={onFechar}
            aria-label="Fechar"
            className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-ink bg-paper text-xs"
          >
            ✕
          </button>
        </div>

        <h2 className="mt-2 mb-3 font-display text-lg uppercase tracking-tight text-ink">
          Adicionar nota
        </h2>

        <textarea
          ref={campo}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder={notas.length > 0 ? "Mais uma nota…" : "Anota aquela frase ou sentimento…"}
          autoFocus
          className="min-h-[92px] w-full resize-none rounded-md border-2 border-ink bg-white p-3 text-sm placeholder:text-ink-soft/60 focus:outline-none"
        />

        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            role="switch"
            aria-checked={publica}
            aria-label={publica ? "Visível para amigos" : "Só você"}
            onClick={() => setPublica((v) => !v)}
            className="rounded-full border-2 border-ink bg-paper px-2.5 py-1 text-xs"
          >
            {publica ? "🌍 amigos" : "🔒 só eu"}
          </button>
          <span className="text-[11px] text-ink-soft">quem pode ver essa nota</span>
        </div>

        {notas.length > 0 && (
          <ListaNotas notas={notas} onRemover={onRemover} className="mt-4" />
        )}

        <p className="mt-3 font-serif text-[11px] italic text-ink-soft">
          Ficam guardadas com a sessão — você escolhe o livro no fim, como hoje.
        </p>

        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={onFechar}
            className="shadow-hard-sm h-12 flex-1 rounded-md border-2 border-ink bg-paper font-display text-xs uppercase tracking-wide text-ink active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
          >
            {notas.length > 0 ? "Fechar" : "Cancelar"}
          </button>
          <button
            type="button"
            onClick={salvar}
            disabled={vazio}
            className="shadow-hard-sm h-12 flex-1 rounded-md border-2 border-ink bg-moss-dark font-display text-xs uppercase tracking-wide text-paper active:translate-x-[1px] active:translate-y-[1px] active:shadow-none disabled:opacity-50"
          >
            Salvar nota
          </button>
        </div>
      </div>
    </div>
  );
}

/** Notas já salvas na sessão, cada uma com quem pode ver e um "tirar". */
function ListaNotas({
  notas,
  onRemover,
  className = "",
}: {
  notas: NotaSessao[];
  onRemover: (id: string) => void;
  className?: string;
}) {
  return (
    <ul className={`space-y-2 ${className}`} aria-label="Notas salvas">
      {notas.map((n) => (
        <li key={n.id} className="flex items-start gap-2 rounded-md border-2 border-cover-border bg-white px-3 py-2">
          <span className="mt-0.5 text-xs" aria-label={n.publica ? "visível para amigos" : "só você"}>
            {n.publica ? "🌍" : "🔒"}
          </span>
          <p className="min-w-0 flex-1 whitespace-pre-line break-words text-sm">{n.texto}</p>
          <button
            type="button"
            onClick={() => onRemover(n.id)}
            aria-label="Apagar nota"
            className="-mr-1 shrink-0 px-1 text-xs text-ink-soft"
          >
            ✕
          </button>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/*  Tela de registro — modelo único (manual e pós-timer)               */
/* ------------------------------------------------------------------ */

/** Caixa de nota do registro: texto + "visível para", e apagar quando é uma
 *  nota que veio do timer. */
function CaixaNota({
  texto,
  onTexto,
  publica,
  onPublica,
  onApagar,
  placeholder = "Anota aquela frase ou sentimento…",
}: {
  texto: string;
  onTexto: (t: string) => void;
  publica: boolean;
  onPublica: (p: boolean) => void;
  onApagar?: () => void;
  placeholder?: string;
}) {
  return (
    <div className="mt-3 rounded-md border-2 border-ink bg-card p-3">
      <textarea
        value={texto}
        onChange={(e) => onTexto(e.target.value)}
        placeholder={placeholder}
        className="min-h-[80px] w-full resize-y bg-transparent text-sm placeholder:text-ink-soft/60 focus:outline-none"
      />
      <div className="mt-2 flex items-center justify-between gap-2">
        {onApagar ? (
          <button
            type="button"
            onClick={onApagar}
            className="text-[11px] font-semibold text-ink-soft underline underline-offset-2"
          >
            apagar nota
          </button>
        ) : (
          <span />
        )}
        <label className="flex items-center gap-2 rounded-md border-2 border-ink bg-paper px-2 py-1">
          <span className="font-display text-[10px] uppercase tracking-widest text-ink-soft">
            visível para:
          </span>
          <select
            value={publica ? "amigos" : "eu"}
            onChange={(e) => onPublica(e.target.value === "amigos")}
            className="bg-transparent text-xs font-medium focus:outline-none"
          >
            <option value="eu">só eu</option>
            <option value="amigos">amigos</option>
          </select>
        </label>
      </div>
    </div>
  );
}

/**
 * Modo % sem total de páginas: o % precisa de uma base, então a caixa pede o
 * total ali mesmo (e grava no livro) em vez de mandar a pessoa pra ficha.
 */
function PedirTotalCapitulos({
  topo,
  onSalvar,
  onNaoSei,
}: {
  topo: ReactNode;
  onSalvar: (total: number) => Promise<string | null>;
  onNaoSei: () => void;
}) {
  const [valor, setValor] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, startSalvar] = useTransition();
  const n = Number(valor);
  const salvar = () => {
    if (!Number.isInteger(n) || n <= 0) {
      setErro("Informe quantos capítulos o livro tem.");
      return;
    }
    startSalvar(async () => {
      setErro(null);
      const e = await onSalvar(n);
      if (e) setErro(e);
    });
  };
  return (
    <div className="shadow-hard-sm rounded-md border-2 border-ink bg-mustard p-3">
      {topo}
      <p className="mt-3 text-[13px] font-semibold text-ink">Quantos capítulos tem esse livro?</p>
      <p className="mt-0.5 text-[12px] text-ink/70">
        Fica salvo no livro. Com o total, a gente acha o seu capítulo pela página.
      </p>
      <div className="mt-2 flex gap-2">
        <input
          type="text"
          inputMode="numeric"
          enterKeyHint="done"
          value={valor}
          placeholder="ex.: 38"
          onChange={(e) => {
            setValor(e.target.value.replace(/[^0-9]/g, "").slice(0, 4));
            setErro(null);
          }}
          onKeyDown={(e) => e.key === "Enter" && salvar()}
          aria-label="Total de capítulos do livro"
          className="shadow-hard-sm min-w-0 flex-1 rounded-md border-2 border-ink bg-card px-3 py-2 font-display text-lg tabular-nums text-ink focus:outline-none"
        />
        <button
          type="button"
          disabled={salvando}
          onClick={salvar}
          className="shadow-hard-sm rounded-md border-2 border-ink bg-ink px-4 font-display text-[12px] uppercase tracking-wide text-paper disabled:opacity-40"
        >
          <ComSpinner ocupado={salvando}>Salvar</ComSpinner>
        </button>
      </div>
      {erro && <p className="mt-2 text-[12px] font-medium text-coral">{erro}</p>}
      <button
        type="button"
        onClick={onNaoSei}
        className="mt-2 text-[12px] font-semibold text-ink underline underline-offset-2"
      >
        Não sei o total
      </button>
    </div>
  );
}

function PedirTotalPaginas({
  topo,
  onSalvar,
}: {
  topo: ReactNode;
  onSalvar: (total: number) => Promise<string | null>;
}) {
  const [valor, setValor] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, startSalvar] = useTransition();
  const n = Number(valor);
  const valido = Number.isInteger(n) && n > 0;
  return (
    <div className="shadow-hard-sm rounded-md border-2 border-ink bg-mustard p-3">
      {topo}
      <p className="mt-3 text-[13px] font-semibold text-ink">Quantas páginas tem esse livro?</p>
      <p className="mt-0.5 text-[12px] text-ink/70">Pra registrar em %, a gente precisa do total de páginas.</p>
      <div className="mt-2 flex gap-2">
        <input
          type="text"
          inputMode="numeric"
          value={valor}
          placeholder="ex.: 320"
          autoFocus
          onChange={(e) => setValor(e.target.value.replace(/[^0-9]/g, "").slice(0, 5))}
          aria-label="Total de páginas do livro"
          className="shadow-hard-sm min-w-0 flex-1 rounded-md border-2 border-ink bg-card px-3 py-2 font-display text-lg tabular-nums text-ink focus:outline-none"
        />
        <button
          type="button"
          disabled={!valido || salvando}
          onClick={() =>
            startSalvar(async () => {
              setErro(null);
              const e = await onSalvar(n);
              if (e) setErro(e);
            })
          }
          className="shadow-hard-sm rounded-md border-2 border-ink bg-ink px-4 font-display text-[12px] uppercase tracking-wide text-paper disabled:opacity-40"
        >
          <ComSpinner ocupado={salvando}>Salvar</ComSpinner>
        </button>
      </div>
      {erro && <p className="mt-2 text-[12px] font-medium text-coral">{erro}</p>}
    </div>
  );
}

function Passo({
  numero,
  titulo,
  children,
}: {
  numero: string;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-6">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-sm bg-ink font-display text-[11px] text-paper">
          {numero}
        </span>
        <h2 className="font-display text-sm uppercase tracking-tight text-ink">{titulo}</h2>
      </div>
      {children}
    </section>
  );
}

function TelaRegistro({
  books,
  activeChallenges,
  demo,
  minutosIniciais,
  origem,
  startedAt,
  notasIniciais,
  onVoltar,
  onSalvo,
}: {
  books: BookOption[];
  activeChallenges: ActiveChallenge[];
  demo: boolean;
  minutosIniciais: number;
  origem: "timer" | "manual";
  startedAt: string;
  notasIniciais: NotaSessao[];
  onVoltar: () => void;
  onSalvo: (r: { minutos: number; titulo: string; quantidade: number; unidade: SessionUnit }) => void;
}) {
  // Livros achados pela busca da estante (passo 1) e marcados "lendo" nesta
  // tela — somam à lista de quem já estava "lendo". `books` é a prop original
  // e não muda; isto é só o que a pessoa acabou de escolher aqui.
  const [recemMarcados, setRecemMarcados] = useState<BookOption[]>([]);
  // Só "lendo" (mais o que acabou de ser marcado) — nada de cair pra "quero
  // ler" quando não tem nenhum em andamento. O texto vazio logo abaixo já
  // cobre esse caso.
  const disponiveis = [...books.filter((b) => b.status === "reading"), ...recemMarcados];

  const [livroId, setLivroId] = useState<string | null>(disponiveis[0]?.id ?? null);
  // Livros relidos nesta tela: a releitura zera a posição no servidor, então
  // aqui também — senão o passo 02 abriria na última página da leitura antiga.
  const [relidos, setRelidos] = useState<Set<string>>(new Set());
  const [buscaEstante, setBuscaEstante] = useState("");
  // Enquanto marca "lendo"/começa a releitura no servidor, salvar espera — a
  // sessão precisa partir da posição já zerada da releitura.
  const [marcandoLendo, startMarcarLendo] = useTransition();
  const [unidade, setUnidade] = useState<UnidadeCampo>(() => unidadeDoLivro(disponiveis[0] ?? null));
  // A métrica gravada: % vira páginas.
  const unidadeMetrica: SessionUnit = unidade === "chapters" ? "chapters" : "pages";
  // Total de páginas informado aqui mesmo (pra liberar o %) — vale já nesta tela.
  const [totaisInformados, setTotaisInformados] = useState<Record<string, number>>({});
  // Total de capítulos informado aqui (ao trocar pra Caps num livro já
  // registrado em páginas) e os livros em que a pessoa disse "não sei".
  const [capsInformados, setCapsInformados] = useState<Record<string, number>>({});
  const [semTotalCaps, setSemTotalCaps] = useState<Set<string>>(new Set());
  // O que o campo "Onde você parou?" calculou (posição, quanto conta, avisos).
  const [posicao, setPosicao] = useState<EstadoPosicao>(ESTADO_POSICAO_VAZIO);
  // `total` é sempre minuto — é o que a sessão grava. A unidade só muda como o
  // número aparece e é digitado, igual ao check-in de desafio.
  const [total, setTotal] = useState(minutosIniciais);
  const [unidadeTempo, setUnidadeTempo] = useState<UnidadeTempo>("min");
  const [tags, setTags] = useState<Set<string>>(new Set());
  // Notas escritas com o timer rodando ("+ Nota", ver TelaRodando): aparecem
  // em lista acima da caixa, e cada uma vira um comentário separado no livro.
  // A caixa é pra mais uma, escrita agora.
  const [notasTimer, setNotasTimer] = useState<NotaSessao[]>(notasIniciais);
  const [nota, setNota] = useState("");
  const [visibilidade, setVisibilidade] = useState<"eu" | "amigos">(
    notasIniciais[notasIniciais.length - 1]?.publica ? "amigos" : "eu",
  );
  // "comentar" do passo 05: vai só pro desafio (legenda do check-in). A nota
  // do passo 04 é do livro e não vai mais pro desafio — cada texto num lugar.
  // Um por desafio (id → texto); a caixa aberta é a do desafio que tem chave.
  const [comentariosDesafio, setComentariosDesafio] = useState<Record<string, string>>({});
  const [desafiosOn, setDesafiosOn] = useState<Set<string>>(
    () => new Set(activeChallenges.filter((d) => d.scoring_metric === "active_days").map((d) => d.id)),
  );
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, startSave] = useTransition();

  const livroAchado = disponiveis.find((l) => l.id === livroId) ?? null;
  const livroBase = livroAchado && {
    ...livroAchado,
    totalPaginas: totaisInformados[livroAchado.id] ?? livroAchado.totalPaginas,
    totalCapitulos: capsInformados[livroAchado.id] ?? livroAchado.totalCapitulos,
  };
  const livro =
    livroBase && relidos.has(livroBase.id)
      ? { ...livroBase, status: "reading", paginaAtual: 0, capituloAtual: 0, percentualAtual: null }
      : livroBase;
  const quantidade = livro ? posicao.delta : 0;
  // Sessão em capítulos num livro com os dois totais: a página anda junto,
  // estimada pelo capítulo — metas por página e previsão de término não
  // param. Só pra frente: a estimativa nunca recua a página registrada.
  const paginaEstimada =
    livro &&
    unidade === "chapters" &&
    posicao.posicao != null &&
    posicao.delta > 0 &&
    livro.totalPaginas &&
    livro.totalCapitulos
      ? (() => {
          const p = paginaDoCapitulo(posicao.posicao, livro.totalPaginas, livro.totalCapitulos);
          return p > (livro.paginaAtual ?? 0) ? p : null;
        })()
      : null;

  function escolherLivro(id: string | null) {
    setLivroId(id);
    setUnidade(unidadeDoLivro(disponiveis.find((l) => l.id === id) ?? null));
    setPosicao(ESTADO_POSICAO_VAZIO);
  }

  // Livros da estante que ainda não aparecem no passo 1 (qualquer status
  // menos "lendo" — "quero ler", "terminei" etc.) e batem com a busca.
  const normalizar = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const termoEstante = normalizar(buscaEstante.trim());
  const resultadosEstante =
    termoEstante.length >= 2
      ? books
          .filter(
            (b) =>
              !disponiveis.some((d) => d.id === b.id) &&
              (normalizar(b.title).includes(termoEstante) || normalizar(b.author).includes(termoEstante)),
          )
          .slice(0, 6)
      : [];

  // Escolher na busca marca "lendo" de verdade (não só nesta tela) — assim o
  // livro passa a aparecer aqui de cara nas próximas sessões, sem precisar
  // buscar de novo toda vez.
  // Livro terminado vira releitura (a leitura anterior fica guardada e
  // continua contando); trocar só o status apagaria a data de término.
  function escolherDaEstante(escolhido: BookOption) {
    const relendo = escolhido.status === "finished";
    setRecemMarcados((prev) => [...prev, escolhido]);
    if (relendo) setRelidos((prev) => new Set(prev).add(escolhido.id));
    setLivroId(escolhido.id);
    setUnidade(relendo ? "pages" : unidadeDoLivro(escolhido));
    setPosicao(ESTADO_POSICAO_VAZIO);
    setBuscaEstante("");
    if (!demo) {
      startMarcarLendo(async () => {
        if (relendo) await iniciarReleitura(escolhido.id);
        else await updateItemStatus(escolhido.id, "reading");
      });
    }
  }

  function toggleTag(value: string) {
    setTags((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }

  function toggleDesafio(id: string) {
    setDesafiosOn((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function finalizar() {
    setErro(null);
    if (livro && posicao.bloqueio) {
      setErro(posicao.bloqueio);
      return;
    }
    startSave(async () => {
      if (demo) {
        onSalvo({
          minutos: total,
          titulo: livro?.title ?? "Sem livro vinculado",
          quantidade,
          unidade: unidadeMetrica,
        });
        return;
      }
      const resultado = await createSession({
        itemId: livroId,
        startedAt,
        durationSeconds: Math.max(60, total * 60),
        pagina: livro && unidadeMetrica === "pages" ? posicao.posicao : paginaEstimada,
        capitulo: livro && unidade === "chapters" ? posicao.posicao : null,
        paginaAntes: unidadeMetrica === "pages" ? posicao.antes : null,
        capituloAntes: unidade === "chapters" ? posicao.antes : null,
        percentual: livro && unidade === "percent" ? (posicao.percentual ?? null) : null,
        percentualAntes: unidade === "percent" ? (posicao.percentualAntes ?? null) : null,
        tags: [...tags],
      });

      if (resultado.error || !resultado.sessionId) {
        setErro(resultado.error ?? "Algo deu errado ao salvar.");
        return;
      }

      if (desafiosOn.size > 0) {
        await publishSession({
          sessionId: resultado.sessionId,
          itemId: livroId,
          groupIds: [...desafiosOn],
          note: null,
          notasPorGrupo: Object.fromEntries(
            [...desafiosOn].map((id) => [id, comentariosDesafio[id]?.trim() || null]),
          ),
        });
      }

      if (livroId) {
        const paraSalvar = [
          ...notasTimer
            .filter((n) => n.texto.trim())
            .map((n) => ({ texto: n.texto, publica: n.publica })),
          ...(nota.trim() ? [{ texto: nota, publica: visibilidade === "amigos" }] : []),
        ];
        // Em ordem, uma de cada vez: os comentários ficam na sequência em que
        // foram escritos na página do livro.
        for (const n of paraSalvar) {
          await saveSessionMemory({ itemId: livroId, text: n.texto, isPublic: n.publica });
        }
      }

      onSalvo({
        minutos: total,
        titulo: livro?.title ?? "Sem livro vinculado",
        quantidade,
        unidade: unidadeMetrica,
      });
    });
  }

  // Sem livro o passo "Onde você parou?" some — a numeração acompanha.
  const passos = ["livro", ...(livro ? ["posicao"] : []), "tempo", "como", "desafios"];
  const numeroPasso = (id: string) => String(passos.indexOf(id) + 1).padStart(2, "0");

  return (
    <div className="min-h-full">
      <header className="relative flex flex-col">
        <div className="relative flex items-center justify-between gap-3 overflow-visible border-y-2 border-ink bg-mustard px-5 py-6">
          <div className="absolute left-3 top-2 flex gap-1 opacity-20">
            <span className="size-2 rounded-full bg-ink" />
            <span className="size-2 rounded-full bg-ink" />
            <span className="size-2 rounded-full bg-ink" />
          </div>

          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={onVoltar}
              aria-label="Voltar"
              className="shadow-hard-sm flex size-10 shrink-0 items-center justify-center rounded-md border-2 border-ink bg-card text-ink active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </button>

            <h1 className="font-display text-3xl uppercase leading-none tracking-tight text-ink">
              Registrar
              <br />
              leitura
            </h1>
          </div>

          <div className="relative shrink-0">
            <div className="absolute -bottom-1 -right-1 size-16 rounded-full bg-ink/10" />
            <div className="relative flex size-16 items-center justify-center rounded-2xl border-2 border-ink bg-card shadow-[4px_4px_0_0_var(--color-coral)]">
              <AppImage
                slot={origem === "timer" ? "ler.resumo-timer" : "ler.resumo-manual"}
                src={
                  origem === "timer"
                    ? "/img/mascot/quill-timer-completo.webp"
                    : "/img/mascot/quill-lendo.webp"
                }
                alt=""
                width={48}
                height={48}
                className="size-12 object-contain"
              />
            </div>
          </div>
        </div>

        <div className="mt-2 px-5">
          <div className="h-1 w-24 rounded-full bg-coral" />
        </div>
      </header>

      <div className="px-5 pb-10 pt-4">
        {/* 01 — Livro */}
        <Passo numero={numeroPasso("livro")} titulo="Em qual livro?">
          {disponiveis.length === 0 ? (
            <p className="rounded-md border-2 border-dashed border-ink bg-card p-4 text-center font-serif text-sm italic text-ink-soft">
              Você não tem nenhum livro marcado como “lendo” — busque um da
              sua estante abaixo, ou a sessão vale só pelo tempo.
            </p>
          ) : (
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
              {disponiveis.map((l) => {
                const on = livroId === l.id;
                return (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => escolherLivro(l.id)}
                    aria-pressed={on}
                    className={`w-[116px] shrink-0 rounded-md border-2 border-ink p-2 text-left ${
                      on ? "shadow-hard-sm bg-moss text-paper" : "bg-card text-ink"
                    }`}
                  >
                    <BookThumb item={l} />
                    <span className="mt-2 block line-clamp-2 text-xs font-medium leading-tight">
                      {l.title}
                    </span>
                    <span className={`mt-0.5 block text-[10px] ${on ? "text-paper/80" : "text-ink-soft"}`}>
                      {relidos.has(l.id)
                        ? "relendo"
                        : l.percentualAtual != null
                          ? `${l.percentualAtual}%`
                          : l.paginaAtual
                          ? `pág. ${l.paginaAtual}`
                          : l.capituloAtual
                            ? `cap. ${l.capituloAtual}`
                            : l.author || "sem autor"}
                    </span>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => escolherLivro(null)}
                aria-pressed={livroId === null}
                className={`w-[116px] shrink-0 rounded-md border-2 border-dashed border-ink p-2 text-left ${
                  livroId === null ? "shadow-hard-sm bg-ink text-paper" : "bg-card text-ink"
                }`}
              >
                <span className="flex aspect-[2/3] w-[92px] items-center justify-center rounded-sm border-2 border-dashed border-current text-lg opacity-60">
                  —
                </span>
                <span className="mt-2 block text-xs font-medium">Não vincular</span>
                <span className="mt-0.5 block text-[10px] opacity-70">só o tempo</span>
              </button>
            </div>
          )}

          {/* Busca na estante: acha livro com outro status ("quero ler",
              "terminei"...) pra retomar. Escolher marca "lendo" de verdade —
              não só nesta tela — e some da lista de resultados. */}
          <div className="mt-3">
            <input
              type="search"
              value={buscaEstante}
              onChange={(e) => setBuscaEstante(e.target.value)}
              placeholder="Buscar outro livro da sua estante"
              className="w-full rounded-md border-2 border-ink bg-card px-3 py-2 text-sm placeholder:text-ink-soft focus:outline-none"
            />
            {termoEstante.length >= 2 &&
              (resultadosEstante.length > 0 ? (
                <ul className="mt-2 flex flex-col gap-1.5">
                  {resultadosEstante.map((l) => (
                    <li key={l.id}>
                      <button
                        type="button"
                        onClick={() => escolherDaEstante(l)}
                        className="flex w-full items-center gap-2 rounded-md border-2 border-ink bg-card p-1.5 text-left transition-all hover:shadow-hard-sm active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                      >
                        <span className="h-9 w-6 shrink-0 overflow-hidden rounded-sm border border-ink/40">
                          <BookCover item={l} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-medium">{l.title}</span>
                          <span className="block truncate text-[10px] text-ink-soft">
                            {l.author || "sem autor"}
                          </span>
                        </span>
                        <span className="shrink-0 font-display text-[9px] uppercase tracking-wide text-moss-dark">
                          {l.status === "finished" ? "reler" : "marcar lendo"}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-xs text-ink-soft">Não achei esse livro na sua estante.</p>
              ))}
          </div>
        </Passo>

        {/* 02 — Onde parou: a pessoa diz a página/capítulo/% atual e o app faz
            a conta com a posição anterior. Sem livro não tem posição. O % só
            funciona com total de páginas — sem ele, pede o total ali mesmo. */}
        {livro && (
          <Passo numero={numeroPasso("posicao")} titulo="Onde você parou?">
            {(() => {
              const seletor = (
                <div className="flex justify-end">
                  <div className="grid grid-cols-3 divide-x-2 divide-ink overflow-hidden rounded-sm border-2 border-ink">
                    {(["pages", "chapters", "percent"] as const).map((m) => {
                      const ativo = unidade === m;
                      const semBase = m === "percent" && !livro.totalPaginas;
                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => {
                            setUnidade(m);
                            setPosicao(ESTADO_POSICAO_VAZIO);
                          }}
                          aria-pressed={ativo}
                          className={`px-4 py-1.5 font-display text-[11px] uppercase tracking-wide ${
                            ativo ? "bg-ink text-paper" : semBase ? "bg-card text-ink/35" : "bg-card text-ink"
                          }`}
                        >
                          {m === "pages" ? "Páginas" : m === "chapters" ? "Caps" : "%"}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
              if (unidade === "percent" && !livro.totalPaginas) {
                return (
                  <PedirTotalPaginas
                    key={livro.id}
                    topo={seletor}
                    onSalvar={async (n) => {
                      if (!demo) {
                        const r = await atualizarCampoLivro(livro.id, "paginas", String(n));
                        if (r.error) return r.error;
                      }
                      setTotaisInformados((prev) => ({ ...prev, [livro.id]: n }));
                      return null;
                    }}
                  />
                );
              }
              // Trocou pra Caps num livro já registrado em páginas e sem total
              // de capítulos: pede o total antes — com ele o app acha o
              // capítulo pela página. "Não sei" segue sem estimativa.
              if (
                unidade === "chapters" &&
                livro.capituloAtual == null &&
                livro.paginaAtual != null &&
                livro.totalPaginas &&
                !livro.totalCapitulos &&
                !semTotalCaps.has(livro.id)
              ) {
                return (
                  <PedirTotalCapitulos
                    key={livro.id}
                    topo={seletor}
                    onNaoSei={() => setSemTotalCaps((prev) => new Set(prev).add(livro.id))}
                    onSalvar={async (n) => {
                      if (!demo) {
                        const r = await atualizarCampoLivro(livro.id, "capitulos", String(n));
                        if (r.error) return r.error;
                      }
                      setCapsInformados((prev) => ({ ...prev, [livro.id]: n }));
                      return null;
                    }}
                  />
                );
              }
              const sugestaoCap =
                unidade === "chapters" &&
                livro.capituloAtual == null &&
                livro.paginaAtual != null &&
                livro.totalPaginas &&
                livro.totalCapitulos
                  ? capituloDaPagina(livro.paginaAtual, livro.totalPaginas, livro.totalCapitulos)
                  : null;
              const anteriorPct =
                unidade !== "percent" || livro.paginaAtual == null
                  ? null
                  : (livro.percentualAtual ?? percentualDaPagina(livro.paginaAtual, livro.totalPaginas!));
              return (
                <CampoPosicao
                  key={`${livro.id}:${unidade}:${relidos.has(livro.id)}:${livro.totalPaginas ?? ""}:${livro.totalCapitulos ?? ""}`}
                  unidade={unidade}
                  anterior={unidade === "chapters" ? livro.capituloAtual : livro.paginaAtual}
                  percentualAnterior={anteriorPct}
                  livroJaRegistrado={livro.paginaAtual != null || livro.capituloAtual != null}
                  sugestaoAntes={
                    sugestaoCap != null
                      ? {
                          valor: sugestaoCap,
                          texto: `Pela pág. ${livro.paginaAtual}, você está por volta do cap. ${sugestaoCap} de ${livro.totalCapitulos}.`,
                        }
                      : null
                  }
                  rodape={
                    paginaEstimada != null ? (
                      <p className="text-right text-[11px] text-ink/70">a página vai para ≈ {paginaEstimada}</p>
                    ) : null
                  }
                  total={unidade === "chapters" ? livro.totalCapitulos : livro.totalPaginas}
                  minutos={total}
                  variante="ler"
                  onChange={setPosicao}
                  topo={seletor}
                />
              );
            })()}
          </Passo>
        )}

        {/* 03 — Tempo */}
        <Passo numero={numeroPasso("tempo")} titulo="Por quanto tempo?">
          <div className="grid grid-cols-4 gap-2">
            {(unidadeTempo === "h" ? PRESETS_H : PRESETS_MIN).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setTotal(minutosDoValor(p, unidadeTempo))}
                className={`rounded-md border-2 border-ink py-2.5 font-display text-xs tracking-wide active:translate-y-0.5 ${
                  valorNaUnidade(total, unidadeTempo) === p
                    ? "shadow-hard-sm bg-coral text-card"
                    : "bg-card"
                }`}
              >
                {p}
                {unidadeTempo === "h" ? "h" : "m"}
              </button>
            ))}
          </div>
          <div className="mt-2 flex items-stretch gap-2">
            <label className="shadow-hard-sm flex flex-1 cursor-text items-baseline justify-center gap-1 rounded-md border-2 border-ink bg-card py-3 transition-colors focus-within:bg-paper">
              <input
                type="text"
                inputMode="decimal"
                value={valorNaUnidade(total, unidadeTempo)}
                onChange={(e) => {
                  // Vírgula também: no teclado do celular ela é o separador
                  // decimal, e "1,5" precisa virar 1h30 e não zero.
                  const limpo = e.target.value.replace(",", ".").replace(/[^0-9.]/g, "");
                  setTotal(minutosDoValor(Number(limpo) || 0, unidadeTempo));
                }}
                onBlur={() => setTotal((t) => Math.max(1, t))}
                aria-label={`Tempo lido em ${unidadeTempo === "h" ? "horas" : "minutos"}`}
                className="w-16 bg-transparent text-center font-serif text-3xl font-bold focus:outline-none"
              />
            </label>
            <div
              className="flex shrink-0 overflow-hidden rounded-md border-2 border-ink"
              role="group"
              aria-label="Unidade do tempo lido"
            >
              {(["min", "h"] as UnidadeTempo[]).map((u) => (
                <button
                  key={u}
                  type="button"
                  // Ao contrário do check-in, aqui trocar de unidade NÃO mexe
                  // no valor: ele pode ter vindo do cronômetro, e virar 90 min
                  // em 1h apagaria leitura que aconteceu. Mostra 1,5 h mesmo.
                  onClick={() => setUnidadeTempo(u)}
                  aria-pressed={unidadeTempo === u}
                  className={`px-3 font-display text-[10px] uppercase tracking-widest ${
                    unidadeTempo === u ? "bg-ink text-paper" : "bg-card text-ink-soft"
                  }`}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>
          <p className="mt-2 text-center text-[11px] text-ink-soft">
            {origem === "timer"
              ? "tempo medido pelo cronômetro — toque para ajustar"
              : "toque no número para digitar quanto tempo você leu"}
          </p>
        </Passo>

        {/* 04 — Como foi */}
        <Passo numero={numeroPasso("como")} titulo="Como foi hoje?">
          <div className="flex flex-wrap gap-2">
            {TAG_OPTIONS.map((t) => {
              const on = tags.has(t.value);
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => toggleTag(t.value)}
                  aria-pressed={on}
                  className={
                    "h-9 rounded-full border-2 border-ink px-3 text-sm font-medium " +
                    (on
                      ? t.positiva
                        ? "shadow-hard-sm bg-moss text-paper"
                        : "shadow-hard-sm bg-mustard text-ink"
                      : "bg-card text-ink")
                  }
                >
                  {on ? "✓ " : ""}
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* Notas do timer: cada uma numa caixa editável, com a própria
              visibilidade. A última caixa (vazia) é pra mais uma. */}
          {notasTimer.map((n) => (
            <CaixaNota
              key={n.id}
              texto={n.texto}
              onTexto={(t) =>
                setNotasTimer((ns) => ns.map((x) => (x.id === n.id ? { ...x, texto: t } : x)))
              }
              publica={n.publica}
              onPublica={(p) =>
                setNotasTimer((ns) => ns.map((x) => (x.id === n.id ? { ...x, publica: p } : x)))
              }
              onApagar={() => setNotasTimer((ns) => ns.filter((x) => x.id !== n.id))}
            />
          ))}

          <CaixaNota
            texto={nota}
            onTexto={setNota}
            publica={visibilidade === "amigos"}
            onPublica={(p) => setVisibilidade(p ? "amigos" : "eu")}
            placeholder={notasTimer.length > 0 ? "Mais uma nota…" : "Anota aquela frase ou sentimento…"}
          />

          {(nota.trim() || notasTimer.some((n) => n.texto.trim())) && !livroId && (
            <p className="mt-2 text-[11px] text-ink-soft">
              Vincule um livro para a anotação virar comentário na página dele.
            </p>
          )}
        </Passo>

        {/* 05 — Desafios */}
        {activeChallenges.length > 0 && (
          <Passo numero={numeroPasso("desafios")} titulo="Publicar nos desafios">
            <ul className="space-y-2">
              {activeChallenges.map((d) => {
                const on = desafiosOn.has(d.id);
                const valor =
                  d.scoring_metric === "active_days" || d.scoring_metric === "check_ins"
                    ? "+1 dia"
                    : d.scoring_metric === "minutes"
                      ? `+${total} min`
                      : d.scoring_metric === "pages"
                        ? `+${unidadeMetrica === "pages" ? quantidade : 0} pág`
                        : `+${unidade === "chapters" ? quantidade : 0} cap`;
                return (
                  <li
                    key={d.id}
                    className={`rounded-md border-2 border-ink ${on ? "shadow-hard-sm bg-card" : "bg-card/60"}`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleDesafio(d.id)}
                      aria-pressed={on}
                      className="flex w-full items-center gap-3 p-3 text-left"
                    >
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-sm border-2 border-ink ${
                          on ? "bg-moss text-paper" : "bg-paper"
                        }`}
                      >
                        {on && <span className="text-xs font-bold">✓</span>}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">
                          {d.name}
                        </span>
                        <span className="block text-[11px] text-ink-soft">
                          pontua por {metricLabel(d.scoring_metric)}
                        </span>
                      </span>
                      <span
                        className={`shrink-0 rounded-full border-2 border-ink px-2 py-0.5 font-display text-[10px] ${
                          on ? "bg-navy text-paper" : "bg-paper text-ink-soft"
                        }`}
                      >
                        {valor}
                      </span>
                    </button>

                    {/* "comentar" do desafio: só nele, nunca na página do livro */}
                    {on &&
                      (d.id in comentariosDesafio ? (
                        <div className="px-3 pb-3">
                          <div className="rounded-md border-2 border-ink bg-paper p-2.5">
                            <textarea
                              value={comentariosDesafio[d.id]}
                              onChange={(e) =>
                                setComentariosDesafio((c) => ({ ...c, [d.id]: e.target.value }))
                              }
                              placeholder="Conta pro pessoal do desafio como foi…"
                              autoFocus
                              className="min-h-[64px] w-full resize-y bg-transparent text-sm placeholder:text-ink-soft/60 focus:outline-none"
                            />
                          </div>
                          <div className="mt-1.5 flex items-center justify-between gap-2">
                            <p className="text-[11px] text-ink-soft">Só neste desafio — não vai pra página do livro.</p>
                            <button
                              type="button"
                              onClick={() =>
                                setComentariosDesafio((c) => {
                                  const resto = { ...c };
                                  delete resto[d.id];
                                  return resto;
                                })
                              }
                              className="shrink-0 text-[11px] font-semibold text-ink-soft underline underline-offset-2"
                            >
                              cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="-mt-1 flex justify-end px-3 pb-2.5">
                          <button
                            type="button"
                            onClick={() => setComentariosDesafio((c) => ({ ...c, [d.id]: "" }))}
                            className="text-[11px] font-semibold text-ink-soft underline underline-offset-2"
                          >
                            comentar
                          </button>
                        </div>
                      ))}
                  </li>
                );
              })}
            </ul>

          </Passo>
        )}

        {erro && <p className="mt-4 text-center text-sm font-medium text-coral">{erro}</p>}

        <button
          type="button"
          onClick={finalizar}
          disabled={salvando || marcandoLendo}
          className="shadow-hard mt-8 flex w-full items-center justify-center gap-2 rounded-md border-2 border-ink bg-coral py-4 font-display text-lg tracking-wide text-card transition hover:shadow-hard-hover active:translate-y-1 active:shadow-none disabled:opacity-60"
        >
          <ComSpinner ocupado={salvando}>{salvando ? "Salvando…" : "✓ Finalizar registro"}</ComSpinner>
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Confirmação                                                        */
/* ------------------------------------------------------------------ */

function TelaSalvo({
  resumo,
  onVoltar,
}: {
  resumo: { minutos: number; titulo: string; quantidade: number; unidade: SessionUnit };
  onVoltar: () => void;
}) {
  const horas = Math.floor(resumo.minutos / 60);
  const mins = resumo.minutos % 60;

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-5 py-12 text-center">
      <AppImage
        slot="ler.fim"
        src="/img/mascot/quill-comemorando.webp"
        alt="Quill comemorando"
        width={200}
        height={200}
        className="w-40"
      />
      <span className="mt-3 inline-flex h-7 items-center gap-1.5 rounded-full border-2 border-ink bg-moss px-3 font-display text-[11px] tracking-wide text-paper">
        ✓ sessão salva
      </span>
      <h1 className="mt-3 font-display text-3xl leading-tight">
        +{horas > 0 ? `${horas}h ` : ""}
        {mins} min registrados!
      </h1>
      <p className="mt-2 text-sm text-ink-soft">
        {resumo.titulo}
        {resumo.quantidade > 0
          ? ` · ${resumo.quantidade} ${resumo.unidade === "pages" ? "pág" : "cap"}`
          : ""}
      </p>
      <button
        type="button"
        onClick={onVoltar}
        className="shadow-hard mt-8 w-full max-w-sm rounded-md border-2 border-ink bg-mustard py-3.5 font-display text-base tracking-wide active:translate-y-1 active:shadow-none"
      >
        Voltar ao início
      </button>
    </div>
  );
}
