"use client";

import { AppImage } from "@/components/app-image";
import {
  minutosDoValor,
  valorNaUnidade,
  type UnidadeTempo,
} from "@/lib/tempo";
import { BookThumb } from "@/components/book-thumb";
import type { CoverFields } from "@/components/book-cover";
import { useEffect, useState, useTransition } from "react";
import {
  createSession,
  publishSession,
  saveSessionMemory,
  type SessionUnit,
} from "@/app/actions/sessions";
import type { ActiveChallenge } from "@/lib/challenges";

export type BookOption = CoverFields & {
  id: string;
  author: string;
  status: string;
  paginaAtual: number | null;
};

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

export function FreeReadingSession({
  books,
  activeChallenges,
}: {
  books: BookOption[];
  activeChallenges: ActiveChallenge[];
}) {
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

  const rodando = fase === "rodando" && !pausado;

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
        minutosIniciais={minutosSessao}
        origem={origem}
        startedAt={startedAt ?? new Date().toISOString()}
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
        onManual={abrirManual}
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
        <p className="mt-1 text-xs text-ink-soft">Vincular a um livro é opcional.</p>

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
  onManual,
}: {
  segundos: number;
  pausado: boolean;
  onPausar: () => void;
  onEncerrar: () => void;
  onManual: () => void;
}) {
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

      <div className="mt-6 text-center">
        <button
          type="button"
          onClick={onManual}
          className="text-sm font-medium text-moss-dark underline underline-offset-4"
        >
          Leu sem o timer? Registrar manualmente
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tela de registro — modelo único (manual e pós-timer)               */
/* ------------------------------------------------------------------ */

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
  minutosIniciais,
  origem,
  startedAt,
  onVoltar,
  onSalvo,
}: {
  books: BookOption[];
  activeChallenges: ActiveChallenge[];
  minutosIniciais: number;
  origem: "timer" | "manual";
  startedAt: string;
  onVoltar: () => void;
  onSalvo: (r: { minutos: number; titulo: string; quantidade: number; unidade: SessionUnit }) => void;
}) {
  const lendo = books.filter((b) => b.status === "reading");
  const disponiveis = lendo.length > 0 ? lendo : books;

  const [livroId, setLivroId] = useState<string | null>(disponiveis[0]?.id ?? null);
  const [unidade, setUnidade] = useState<SessionUnit>("pages");
  const [quantidade, setQuantidade] = useState(0);
  // `total` é sempre minuto — é o que a sessão grava. A unidade só muda como o
  // número aparece e é digitado, igual ao check-in de desafio.
  const [total, setTotal] = useState(minutosIniciais);
  const [unidadeTempo, setUnidadeTempo] = useState<UnidadeTempo>("min");
  const [tags, setTags] = useState<Set<string>>(new Set());
  const [nota, setNota] = useState("");
  const [visibilidade, setVisibilidade] = useState<"eu" | "amigos">("eu");
  const [desafiosOn, setDesafiosOn] = useState<Set<string>>(
    () => new Set(activeChallenges.filter((d) => d.scoring_metric === "active_days").map((d) => d.id)),
  );
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, startSave] = useTransition();

  const livro = disponiveis.find((l) => l.id === livroId) ?? null;

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
    startSave(async () => {
      const resultado = await createSession({
        itemId: livroId,
        startedAt,
        durationSeconds: Math.max(60, total * 60),
        unit: unidade,
        quantity: quantidade > 0 ? quantidade : null,
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
          note: nota.trim() || null,
          pagesExtra: null,
        });
      }

      if (livroId && nota.trim()) {
        await saveSessionMemory({
          itemId: livroId,
          text: nota,
          isPublic: visibilidade === "amigos",
        });
      }

      onSalvo({
        minutos: total,
        titulo: livro?.title ?? "Sem livro vinculado",
        quantidade,
        unidade,
      });
    });
  }

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
        <Passo numero="01" titulo="Em qual livro?">
          {disponiveis.length === 0 ? (
            <p className="rounded-md border-2 border-dashed border-ink bg-card p-4 text-center font-serif text-sm italic text-ink-soft">
              Você não tem nenhum livro marcado como “lendo” — a sessão vale
              pelo tempo.
            </p>
          ) : (
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
              {disponiveis.map((l) => {
                const on = livroId === l.id;
                return (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => setLivroId(l.id)}
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
                      {l.paginaAtual ? `pág. ${l.paginaAtual}` : l.author || "sem autor"}
                    </span>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setLivroId(null)}
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
        </Passo>

        {/* 02 — Quanto leu */}
        <Passo numero="02" titulo="Quanto você leu?">
          <div className="shadow-hard-sm rounded-md border-2 border-ink bg-mustard p-3">
            <div className="flex justify-end">
              <div className="grid grid-cols-2 overflow-hidden rounded-sm border-2 border-ink">
                {(["pages", "chapters"] as const).map((m) => {
                  const ativo = unidade === m;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        setUnidade(m);
                        setQuantidade(0);
                      }}
                      className={`px-4 py-1.5 font-display text-[11px] uppercase tracking-wide ${
                        ativo ? "bg-ink text-paper" : "bg-card text-ink"
                      }`}
                    >
                      {m === "pages" ? "Páginas" : "Caps"}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-3 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setQuantidade((q) => Math.max(0, q - (unidade === "pages" ? 5 : 1)))}
                className="h-12 w-12 shrink-0 rounded-md border-2 border-ink bg-card font-display text-xl leading-none active:translate-y-0.5"
                aria-label="diminuir"
              >
                −
              </button>
              <div className="flex-1 rounded-md border-2 border-ink bg-card py-2 text-center">
                <span className="font-display text-3xl leading-none tabular-nums">{quantidade}</span>
                <span className="ml-1 text-xs uppercase text-ink-soft">
                  {unidade === "pages" ? "pág" : "cap"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setQuantidade((q) => q + (unidade === "pages" ? 5 : 1))}
                className="h-12 w-12 shrink-0 rounded-md border-2 border-ink bg-card font-display text-xl leading-none active:translate-y-0.5"
                aria-label="aumentar"
              >
                +
              </button>
            </div>
          </div>
          {livro && unidade === "pages" && quantidade > 0 && (
            <p className="mt-2 text-[11px] text-ink-soft">
              {livro.title} vai da pág. {livro.paginaAtual ?? 0} para{" "}
              {(livro.paginaAtual ?? 0) + quantidade}
            </p>
          )}
        </Passo>

        {/* 03 — Tempo */}
        <Passo numero="03" titulo="Por quanto tempo?">
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
        <Passo numero="04" titulo="Como foi hoje?">
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

          <div className="mt-3 rounded-md border-2 border-ink bg-card p-3">
            <textarea
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Anota aquela frase ou sentimento…"
              className="min-h-[80px] w-full resize-y bg-transparent text-sm placeholder:text-ink-soft/60 focus:outline-none"
            />
            <div className="mt-2 flex justify-end">
              <label className="flex items-center gap-2 rounded-md border-2 border-ink bg-paper px-2 py-1">
                <span className="font-display text-[10px] uppercase tracking-widest text-ink-soft">
                  visível para:
                </span>
                <select
                  value={visibilidade}
                  onChange={(e) => setVisibilidade(e.target.value as "eu" | "amigos")}
                  className="bg-transparent text-xs font-medium focus:outline-none"
                >
                  <option value="eu">só eu</option>
                  <option value="amigos">amigos</option>
                </select>
              </label>
            </div>
            {nota.trim() && !livroId && (
              <p className="mt-2 text-[11px] text-ink-soft">
                Vincule um livro para a anotação virar comentário na página dele.
              </p>
            )}
          </div>
        </Passo>

        {/* 05 — Desafios */}
        {activeChallenges.length > 0 && (
          <Passo numero="05" titulo="Publicar nos desafios">
            <ul className="space-y-2">
              {activeChallenges.map((d) => {
                const on = desafiosOn.has(d.id);
                const valor =
                  d.scoring_metric === "active_days" || d.scoring_metric === "check_ins"
                    ? "+1 dia"
                    : d.scoring_metric === "minutes"
                      ? `+${total} min`
                      : d.scoring_metric === "pages"
                        ? `+${unidade === "pages" ? quantidade : 0} pág`
                        : `+${unidade === "chapters" ? quantidade : 0} cap`;
                return (
                  <li key={d.id}>
                    <button
                      type="button"
                      onClick={() => toggleDesafio(d.id)}
                      aria-pressed={on}
                      className={`flex w-full items-center gap-3 rounded-md border-2 border-ink p-3 text-left ${
                        on ? "shadow-hard-sm bg-card" : "bg-card/60"
                      }`}
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
          disabled={salvando}
          className="shadow-hard mt-8 flex w-full items-center justify-center gap-2 rounded-md border-2 border-ink bg-coral py-4 font-display text-lg tracking-wide text-card transition hover:shadow-hard-hover active:translate-y-1 active:shadow-none disabled:opacity-60"
        >
          {salvando ? "Salvando…" : "✓ Finalizar registro"}
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
