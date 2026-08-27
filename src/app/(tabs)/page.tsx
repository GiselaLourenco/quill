"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

/* ------------------------------------------------------------------ */
/*  Mock data                                                          */
/* ------------------------------------------------------------------ */

const user = { nome: "Gisela", data: "sexta, 4 de julho" };
const hoje = { lidos: 38, meta: 45 };

const semana = [
  { d: "S", min: 42 },
  { d: "D", min: 68 },
  { d: "S", min: 22 },
  { d: "T", min: 95 },
  { d: "Q", min: 60 },
  { d: "Q", min: 8 },
  { d: "S", min: 38, hoje: true },
];

const mesInfo = { nome: "Julho", ano: 2026, diasNoMes: 31, primeiroDiaSemana: 3, hoje: 4 };
const diasComLeitura = new Set([1, 2, 3, 4]);
const diasDestaque = new Set([2]);

type MetaTipo = "minutos" | "paginas" | "livros";
type MetaAtiva = {
  tipo: MetaTipo;
  label: string;
  atual: number;
  total: number;
  unidade: string;
  periodo: string;
};

const metasAtivas: MetaAtiva[] = [
  { tipo: "minutos", label: "Minutos hoje", atual: 38, total: 45, unidade: "min", periodo: "hoje" },
  { tipo: "paginas", label: "Páginas hoje", atual: 23, total: 30, unidade: "pág", periodo: "hoje" },
  { tipo: "livros",  label: "Livros no ano", atual: 11, total: 24, unidade: "livros", periodo: "2026" },
];

type Desafio = {
  id: string;
  nome: string;
  posicao: string;
  totalParticipantes: number;
  diasRestantes: number;
  progresso: number;
  tone: "coral" | "moss" | "mustard";
};

const desafios: Desafio[] = [
  { id: "ferias",  nome: "Férias Literárias", posicao: "2º", totalParticipantes: 8,  diasRestantes: 27, progresso: 62, tone: "coral" },
  { id: "clube",   nome: "Clube das Cinco",   posicao: "1º", totalParticipantes: 5,  diasRestantes: 12, progresso: 78, tone: "moss" },
  { id: "maratona",nome: "Maratona Sci-Fi",   posicao: "4º", totalParticipantes: 12, diasRestantes: 41, progresso: 35, tone: "mustard" },
];

type PilulaTone = "coral" | "paper" | "mustard" | "moss" | "navy";
type Pilula = {
  id: string;
  label: string;
  valor: string;
  unidade: string;
  tone: PilulaTone;
};

const PILULAS: Pilula[] = [
  { id: "sequencia",   label: "Sequência",  valor: "12",   unidade: "dias",     tone: "moss" },
  { id: "media-dia",   label: "Média/dia",  valor: "23",   unidade: "pág",      tone: "paper" },
  { id: "velocidade",  label: "Velocidade", valor: "31",   unidade: "p/h",      tone: "navy" },
  { id: "min-semana",  label: "Semana",     valor: "3h42", unidade: "lidas",    tone: "paper" },
  { id: "livros-mes",  label: "Livros/mês", valor: "2",    unidade: "no jul",   tone: "mustard" },
  { id: "melhor-hora", label: "Melhor hora",valor: "22h",  unidade: "pico",     tone: "coral" },
];

/* ------------------------------------------------------------------ */
/*  Página                                                             */
/* ------------------------------------------------------------------ */

export default function HomePage() {
  return (
    <div className="flex flex-col gap-5 px-5 pb-8 pt-6">
      <Header />
      <MetasHero />
      <PilulasGrid />
      <CalendarioCard />
      <DesafiosCard />
      <CompartilharBtn />
    </div>
  );
}

/* ---------- Header ------------------------------------------------- */

function Header() {
  return (
    <header className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="font-serif text-3xl italic font-bold leading-tight text-ink underline decoration-mustard decoration-4 underline-offset-4">
          Olá, {user.nome}
        </h1>
        <p className="mt-1 text-[11px] font-semibold uppercase tracking-widest text-ink/60">
          {user.data}
        </p>
      </div>
      <div className="shrink-0">
        <div className="shadow-hard-sm relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 border-ink bg-coral">
          <span className="text-2xl" aria-hidden>📖</span>
        </div>
      </div>
    </header>
  );
}

/* ---------- Metas -------------------------------------------------- */

const TONE_META: Record<MetaTipo, { bg: string; ring: string; accent: string }> = {
  minutos: { bg: "bg-moss",   ring: "var(--color-mustard)", accent: "text-mustard" },
  paginas: { bg: "bg-navy",   ring: "var(--color-coral)",   accent: "text-coral" },
  livros:  { bg: "bg-coral",  ring: "var(--color-ink)",     accent: "text-ink" },
};

function MetasHero() {
  const [ativa, setAtiva] = useState<MetaTipo>("minutos");
  const m = metasAtivas.find((x) => x.tipo === ativa) ?? metasAtivas[0];
  const pct = Math.min(100, Math.round((m.atual / m.total) * 100));
  const t = TONE_META[m.tipo];
  const restante = Math.max(0, m.total - m.atual);
  const escuro = m.tipo !== "livros";

  return (
    <section aria-label="Suas metas" className="space-y-3">
      <div className={`shadow-hard relative overflow-hidden rounded-2xl border-2 border-ink p-5 ${t.bg} ${escuro ? "text-paper" : "text-ink"}`}>
        <div className={`pointer-events-none absolute -right-6 -top-6 h-24 w-24 rotate-12 border-2 ${escuro ? "border-paper/20" : "border-ink/15"}`} />

        <div className="relative z-10 flex items-center gap-4">
          <ProgressoAnel pct={pct} ring={t.ring} escuro={escuro} />
          <div className="min-w-0 flex-1">
            <p className={`font-display text-[10px] uppercase tracking-widest ${escuro ? "text-paper/70" : "text-ink/60"}`}>
              {m.label} · {m.periodo}
            </p>
            <p className="mt-1 font-display text-3xl leading-none">
              {m.atual}
              <span className={`ml-1 font-serif text-base italic ${t.accent}`}>
                /{m.total} {m.unidade}
              </span>
            </p>
            <p className={`mt-2 font-serif text-[12px] italic ${escuro ? "text-paper/90" : "text-ink/70"}`}>
              {pct >= 100 ? "meta batida — bora dobrar? 🔥" : `faltam ${restante} ${m.unidade} pra bater`}
            </p>
          </div>
        </div>

        <div className={`relative z-10 mt-4 grid grid-cols-3 gap-1.5 rounded-full border-2 border-ink p-1 ${escuro ? "bg-ink/30" : "bg-paper/60"}`}>
          {metasAtivas.map((x) => {
            const on = x.tipo === ativa;
            return (
              <button
                key={x.tipo}
                type="button"
                onClick={() => setAtiva(x.tipo)}
                aria-pressed={on}
                className={`rounded-full py-1.5 font-display text-[10px] uppercase tracking-tight transition-colors ${
                  on ? "bg-paper text-ink" : escuro ? "text-paper/80" : "text-ink/70"
                }`}
              >
                {x.tipo === "minutos" ? "Minutos" : x.tipo === "paginas" ? "Páginas" : "Livros"}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function ProgressoAnel({ pct, ring, escuro }: { pct: number; ring: string; escuro: boolean }) {
  const size = 84;
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c - (Math.min(100, pct) / 100) * c;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke={escuro ? "var(--color-paper)" : "var(--color-ink)"} strokeOpacity="0.2" strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={ring} strokeWidth={stroke} strokeLinecap="butt" fill="none" strokeDasharray={c} strokeDashoffset={off} />
      </svg>
      <div className="absolute inset-1.5 flex items-center justify-center overflow-hidden rounded-full border-2 border-ink bg-paper">
        <span className="text-2xl" aria-hidden>{pct >= 100 ? "🎉" : "📖"}</span>
      </div>
    </div>
  );
}

/* ---------- Pílulas ------------------------------------------------ */

const TONE_BG: Record<PilulaTone, string> = {
  coral: "bg-coral text-ink",
  paper: "bg-paper text-ink",
  mustard: "bg-mustard text-ink",
  moss: "bg-moss text-paper",
  navy: "bg-navy text-paper",
};

function PilulasGrid() {
  const [expandido, setExpandido] = useState(false);
  const visiveis = expandido ? PILULAS : PILULAS.slice(0, 4);
  return (
    <section aria-label="Suas estatísticas" className="space-y-2">
      <div className="flex items-baseline justify-between">
        <h3 className="font-display text-sm uppercase tracking-tight text-ink">
          Seus números
        </h3>
        <button
          type="button"
          onClick={() => setExpandido((v) => !v)}
          className="text-[11px] font-bold uppercase tracking-widest text-ink/60 underline underline-offset-2 hover:text-ink"
        >
          {expandido ? "menos" : `ver todas (${PILULAS.length})`}
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {visiveis.map((p) => (
          <PilulaCard key={p.id} p={p} />
        ))}
      </div>
    </section>
  );
}

function PilulaCard({ p }: { p: Pilula }) {
  const dark = p.tone === "moss" || p.tone === "navy";
  return (
    <div className={`shadow-hard-sm rounded-xl border-2 border-ink p-3 ${TONE_BG[p.tone]}`}>
      <p className={`font-display text-[10px] uppercase leading-none ${dark ? "text-paper/70" : "text-ink/60"}`}>
        {p.label}
      </p>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="font-display text-2xl leading-none">{p.valor}</span>
        <span className={`text-[10px] font-bold uppercase ${dark ? "text-paper/70" : "text-ink/60"}`}>
          {p.unidade}
        </span>
      </div>
    </div>
  );
}

/* ---------- Calendário --------------------------------------------- */

type Vista = "semana" | "mes";

function CalendarioCard() {
  const [vista, setVista] = useState<Vista>("semana");
  const totalDias = diasComLeitura.size;
  return (
    <section className="shadow-hard overflow-hidden rounded-2xl border-2 border-ink bg-paper">
      <div className="grid grid-cols-2 border-b-2 border-ink">
        <button
          type="button"
          onClick={() => setVista("semana")}
          className={`py-3 font-display text-[11px] uppercase tracking-widest transition-colors ${
            vista === "semana" ? "bg-ink text-paper" : "bg-paper text-ink/50"
          }`}
          aria-pressed={vista === "semana"}
        >
          Semana
        </button>
        <button
          type="button"
          onClick={() => setVista("mes")}
          className={`border-l-2 border-ink py-3 font-display text-[11px] uppercase tracking-widest transition-colors ${
            vista === "mes" ? "bg-ink text-paper" : "bg-paper text-ink/50"
          }`}
          aria-pressed={vista === "mes"}
        >
          Mês
        </button>
      </div>

      <div className="p-4">
        {vista === "semana" ? <VistaSemana /> : <VistaMes />}

        <p className="mt-4 text-center font-serif text-[11px] italic text-ink/70">
          {vista === "semana" ? (
            <>
              3h42 lidas · <span className="font-bold not-italic text-moss">+18% esta semana</span>
            </>
          ) : (
            <>
              {totalDias} dias lidos em {mesInfo.nome} · <span className="font-bold not-italic text-moss">recorde: 21 dias seguidos</span>
            </>
          )}
        </p>
      </div>
    </section>
  );
}

function VistaSemana() {
  const max = useMemo(() => Math.max(...semana.map((s) => s.min)), []);
  return (
    <>
      <div className="flex items-end justify-between gap-2 h-24">
        {semana.map((s, i) => {
          const h = Math.max(6, Math.round((s.min / max) * 96));
          return (
            <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
              <div
                className={`w-full border-2 border-ink ${s.hoje ? "bg-coral" : "bg-moss/70"}`}
                style={{ height: `${h}px` }}
                aria-label={`${s.d}: ${s.min} minutos`}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between text-[10px] font-bold uppercase text-ink/60">
        {semana.map((s, i) => (
          <span key={i} className={s.hoje ? "text-coral" : ""}>{s.d}</span>
        ))}
      </div>
    </>
  );
}

function VistaMes() {
  const cells: Array<number | null> = [];
  for (let i = 0; i < mesInfo.primeiroDiaSemana; i++) cells.push(null);
  for (let d = 1; d <= mesInfo.diasNoMes; d++) cells.push(d);
  const labels = ["D", "S", "T", "Q", "Q", "S", "S"];

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <h4 className="font-display text-base uppercase text-ink">
          {mesInfo.nome}
        </h4>
        <span className="text-[10px] font-bold uppercase text-ink/50">{mesInfo.ano}</span>
      </div>
      <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[9px] font-bold uppercase text-ink/40">
        {labels.map((l, i) => (
          <span key={i}>{l}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (d === null) return <div key={i} className="aspect-square" />;
          const leu = diasComLeitura.has(d);
          const destaque = diasDestaque.has(d);
          const eHoje = d === mesInfo.hoje;
          return (
            <div
              key={i}
              className={[
                "relative flex aspect-square items-center justify-center border-2 border-ink font-display text-[11px]",
                leu
                  ? destaque
                    ? "bg-moss text-paper"
                    : "bg-moss/40 text-ink"
                  : "bg-paper text-ink/60",
                eHoje ? "shadow-[0_0_0_2px_var(--color-coral)]" : "",
              ].join(" ")}
              aria-label={`Dia ${d}${leu ? ", com leitura" : ""}`}
            >
              {d}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Desafios ----------------------------------------------- */

const TONE_DESAFIO = {
  coral: { bg: "bg-coral", title: "text-paper", chip: "bg-ink text-paper", accent: "bg-mustard" },
  moss: { bg: "bg-moss", title: "text-paper", chip: "bg-paper text-ink", accent: "bg-mustard" },
  mustard: { bg: "bg-mustard", title: "text-ink", chip: "bg-ink text-paper", accent: "bg-coral" },
} as const;

function DesafiosCard() {
  const [ativo, setAtivo] = useState(desafios[0].id);
  const d = desafios.find((x) => x.id === ativo) ?? desafios[0];
  const t = TONE_DESAFIO[d.tone];

  return (
    <section aria-label="Meus desafios" className="space-y-2">
      <div className="flex items-baseline justify-between">
        <h3 className="font-display text-sm uppercase tracking-tight text-ink">
          Meus desafios
        </h3>
        <span className="text-[11px] font-bold uppercase tracking-widest text-ink/50">
          {desafios.length} ativos
        </span>
      </div>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {desafios.map((x) => {
          const on = x.id === ativo;
          return (
            <button
              key={x.id}
              type="button"
              onClick={() => setAtivo(x.id)}
              aria-pressed={on}
              className={`shrink-0 rounded-full border-2 border-ink px-3 py-1.5 font-display text-[10px] uppercase tracking-tight transition-transform ${
                on
                  ? "shadow-hard-sm bg-ink text-paper"
                  : "bg-paper text-ink/70 hover:-translate-y-px"
              }`}
            >
              {x.nome}
            </button>
          );
        })}
      </div>

      <Link
        href="/juntos"
        className={`shadow-hard relative block overflow-hidden rounded-2xl border-2 border-ink p-5 transition-transform active:translate-x-1 active:translate-y-1 active:shadow-none ${t.bg}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className={`font-display text-[10px] uppercase tracking-widest ${d.tone === "mustard" ? "text-ink/70" : "text-ink/80"}`}>
              Você está no
            </p>
            <h3 className={`mt-1 font-serif text-2xl font-bold italic leading-tight ${t.title}`}>
              {d.nome}
            </h3>
          </div>
          <div className={`shadow-hard-sm shrink-0 rounded-full border-2 border-ink px-3 py-1 text-center ${t.chip}`}>
            <p className="font-display text-lg leading-none">{d.posicao}</p>
            <p className="mt-0.5 font-display text-[8px] uppercase tracking-widest opacity-80">
              de {d.totalParticipantes}
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className={`font-serif text-[11px] italic ${d.tone === "mustard" ? "text-ink/80" : "text-paper/90"}`}>
              {d.diasRestantes} dias restantes
            </span>
            <span className={`font-display text-[11px] ${d.tone === "mustard" ? "text-ink" : "text-paper"}`}>
              {d.progresso}%
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full border-2 border-ink bg-ink/20">
            <div className={`h-full ${t.accent}`} style={{ width: `${d.progresso}%` }} />
          </div>
        </div>
      </Link>
    </section>
  );
}

/* ---------- Compartilhar ------------------------------------------- */

function CompartilharBtn() {
  return (
    <button
      type="button"
      className="shadow-hard flex w-full items-center justify-between rounded-xl border-2 border-ink bg-navy px-6 py-4 text-paper transition-transform active:translate-x-1 active:translate-y-1 active:shadow-none"
    >
      <span className="font-display text-xs uppercase tracking-widest">
        Compartilhar minhas metas
      </span>
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
      </svg>
    </button>
  );
}
