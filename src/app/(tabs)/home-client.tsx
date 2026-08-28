"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type MetaTipo = "minutos" | "paginas" | "livros";
type PilulaTone = "coral" | "paper" | "mustard" | "moss" | "navy";
type DesafioTone = "coral" | "moss" | "mustard";

type Meta = { id: string; tipo: MetaTipo; label: string; atual: number; total: number; unidade: string; periodo: string };
type Pilula = { id: string; label: string; valor: string; unidade: string; tone: PilulaTone };
type Desafio = { id: string; nome: string; emoji: string; tone: DesafioTone };
type SemanaItem = { d: string; min: number; hoje?: boolean };
type MesInfo = { nome: string; ano: number; diasNoMes: number; primeiroDiaSemana: number; hoje: number };

const TONE_META: Record<MetaTipo, { bg: string; ring: string; accent: string }> = {
  minutos: { bg: "bg-moss", ring: "var(--color-mustard)", accent: "text-mustard" },
  paginas: { bg: "bg-navy", ring: "var(--color-coral)", accent: "text-coral" },
  livros: { bg: "bg-coral", ring: "var(--color-ink)", accent: "text-ink" },
};

const TONE_BG: Record<PilulaTone, string> = {
  coral: "bg-coral text-ink",
  paper: "bg-paper text-ink",
  mustard: "bg-mustard text-ink",
  moss: "bg-moss text-paper",
  navy: "bg-navy text-paper",
};

const TONE_DESAFIO: Record<DesafioTone, { bg: string; title: string; chip: string }> = {
  coral: { bg: "bg-coral", title: "text-paper", chip: "bg-ink text-paper" },
  moss: { bg: "bg-moss", title: "text-paper", chip: "bg-paper text-ink" },
  mustard: { bg: "bg-mustard", title: "text-ink", chip: "bg-ink text-paper" },
};

export default function HomeClient({
  nomeUsuario, semana, mesInfo, diasComLeitura, metas, desafios, pilulas,
}: {
  nomeUsuario: string;
  semana: SemanaItem[];
  mesInfo: MesInfo;
  diasComLeitura: number[];
  metas: Meta[];
  desafios: Desafio[];
  pilulas: Pilula[];
}) {
  const diasSet = new Set(diasComLeitura);
  const dataHoje = new Date();
  const dataStr = dataHoje.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="flex flex-col gap-5 px-5 pb-8 pt-6">
      {/* Header */}
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-serif text-3xl italic font-bold leading-tight text-ink underline decoration-mustard decoration-4 underline-offset-4">
            Olá, {nomeUsuario}
          </h1>
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-widest text-ink/60 capitalize">
            {dataStr}
          </p>
        </div>
        <div className="shrink-0">
          <div className="shadow-hard-sm relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 border-ink bg-coral">
            <span className="text-2xl" aria-hidden>📖</span>
          </div>
        </div>
      </header>

      {/* Metas */}
      {metas.length > 0 ? (
        <MetasHero metas={metas} />
      ) : (
        <Link href="/metas" className="shadow-hard flex items-center justify-between rounded-2xl border-2 border-ink bg-mustard px-5 py-4">
          <div>
            <p className="font-display text-[10px] uppercase tracking-widest text-ink/70">Suas metas</p>
            <p className="mt-1 font-serif text-lg italic text-ink">Defina uma meta de leitura</p>
          </div>
          <span className="font-display text-2xl text-ink">→</span>
        </Link>
      )}

      {/* Pílulas */}
      {pilulas.length > 0 && <PilulasGrid pilulas={pilulas} />}

      {/* Calendário */}
      <CalendarioCard semana={semana} mesInfo={mesInfo} diasComLeitura={diasSet} />

      {/* Desafios */}
      {desafios.length > 0 && <DesafiosCard desafios={desafios} />}

      {/* Compartilhar */}
      <CompartilharBtn />
    </div>
  );
}

function MetasHero({ metas }: { metas: Meta[] }) {
  const [ativa, setAtiva] = useState<MetaTipo>(metas[0]?.tipo ?? "minutos");
  const m = metas.find((x) => x.tipo === ativa) ?? metas[0];
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
              <span className={`ml-1 font-serif text-base italic ${t.accent}`}>/{m.total} {m.unidade}</span>
            </p>
            <p className={`mt-2 font-serif text-[12px] italic ${escuro ? "text-paper/90" : "text-ink/70"}`}>
              {pct >= 100 ? "meta batida — bora dobrar? 🔥" : `faltam ${restante} ${m.unidade} pra bater`}
            </p>
          </div>
        </div>
        <div className={`relative z-10 mt-4 grid grid-cols-3 gap-1.5 rounded-full border-2 border-ink p-1 ${escuro ? "bg-ink/30" : "bg-paper/60"}`}>
          {metas.map((x) => {
            const on = x.tipo === ativa;
            return (
              <button key={x.tipo} type="button" onClick={() => setAtiva(x.tipo)} aria-pressed={on}
                className={`rounded-full py-1.5 font-display text-[10px] uppercase tracking-tight transition-colors ${on ? "bg-paper text-ink" : escuro ? "text-paper/80" : "text-ink/70"}`}>
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
  const size = 84; const stroke = 8;
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

function PilulasGrid({ pilulas }: { pilulas: Pilula[] }) {
  const [expandido, setExpandido] = useState(false);
  const visiveis = expandido ? pilulas : pilulas.slice(0, 4);
  return (
    <section aria-label="Suas estatísticas" className="space-y-2">
      <div className="flex items-baseline justify-between">
        <h3 className="font-display text-sm uppercase tracking-tight text-ink">Seus números</h3>
        {pilulas.length > 4 && (
          <button type="button" onClick={() => setExpandido((v) => !v)} className="text-[11px] font-bold uppercase tracking-widest text-ink/60 underline underline-offset-2 hover:text-ink">
            {expandido ? "menos" : `ver todas (${pilulas.length})`}
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {visiveis.map((p) => {
          const dark = p.tone === "moss" || p.tone === "navy";
          return (
            <div key={p.id} className={`shadow-hard-sm rounded-xl border-2 border-ink p-3 ${TONE_BG[p.tone]}`}>
              <p className={`font-display text-[10px] uppercase leading-none ${dark ? "text-paper/70" : "text-ink/60"}`}>{p.label}</p>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="font-display text-2xl leading-none">{p.valor}</span>
                <span className={`text-[10px] font-bold uppercase ${dark ? "text-paper/70" : "text-ink/60"}`}>{p.unidade}</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function CalendarioCard({ semana, mesInfo, diasComLeitura }: { semana: SemanaItem[]; mesInfo: MesInfo; diasComLeitura: Set<number> }) {
  const [vista, setVista] = useState<"semana" | "mes">("semana");
  const max = useMemo(() => Math.max(...semana.map((s) => s.min), 1), [semana]);
  const totalDias = diasComLeitura.size;

  const cells: Array<number | null> = [];
  for (let i = 0; i < mesInfo.primeiroDiaSemana; i++) cells.push(null);
  for (let d = 1; d <= mesInfo.diasNoMes; d++) cells.push(d);
  const labels = ["D", "S", "T", "Q", "Q", "S", "S"];

  return (
    <section className="shadow-hard overflow-hidden rounded-2xl border-2 border-ink bg-paper">
      <div className="grid grid-cols-2 border-b-2 border-ink">
        {(["semana", "mes"] as const).map((v) => (
          <button key={v} type="button" onClick={() => setVista(v)} aria-pressed={vista === v}
            className={`py-3 font-display text-[11px] uppercase tracking-widest transition-colors ${v === "mes" ? "border-l-2 border-ink" : ""} ${vista === v ? "bg-ink text-paper" : "bg-paper text-ink/50"}`}>
            {v === "semana" ? "Semana" : "Mês"}
          </button>
        ))}
      </div>
      <div className="p-4">
        {vista === "semana" ? (
          <>
            <div className="flex items-end justify-between gap-2 h-24">
              {semana.map((s, i) => {
                const h = Math.max(6, Math.round((s.min / max) * 96));
                return (
                  <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                    <div className={`w-full border-2 border-ink ${s.hoje ? "bg-coral" : s.min > 0 ? "bg-moss/70" : "bg-ink/10"}`} style={{ height: `${h}px` }} aria-label={`${s.d}: ${s.min} minutos`} />
                  </div>
                );
              })}
            </div>
            <div className="mt-2 flex justify-between text-[10px] font-bold uppercase text-ink/60">
              {semana.map((s, i) => <span key={i} className={s.hoje ? "text-coral" : ""}>{s.d}</span>)}
            </div>
          </>
        ) : (
          <div>
            <div className="mb-2 flex items-baseline justify-between">
              <h4 className="font-display text-base uppercase text-ink capitalize">{mesInfo.nome}</h4>
              <span className="text-[10px] font-bold uppercase text-ink/50">{mesInfo.ano}</span>
            </div>
            <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[9px] font-bold uppercase text-ink/40">
              {labels.map((l, i) => <span key={i}>{l}</span>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {cells.map((d, i) => {
                if (d === null) return <div key={i} className="aspect-square" />;
                const leu = diasComLeitura.has(d);
                const eHoje = d === mesInfo.hoje;
                return (
                  <div key={i} className={["relative flex aspect-square items-center justify-center border-2 border-ink font-display text-[11px]", leu ? "bg-moss/40 text-ink" : "bg-paper text-ink/60", eHoje ? "shadow-[0_0_0_2px_var(--color-coral)]" : ""].join(" ")} aria-label={`Dia ${d}${leu ? ", com leitura" : ""}`}>
                    {d}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <p className="mt-4 text-center font-serif text-[11px] italic text-ink/70">
          {vista === "semana"
            ? `${semana.reduce((s, x) => s + x.min, 0)} min lidos esta semana`
            : `${totalDias} dias lidos em ${mesInfo.nome}`}
        </p>
      </div>
    </section>
  );
}

function DesafiosCard({ desafios }: { desafios: Desafio[] }) {
  const [ativo, setAtivo] = useState(desafios[0]?.id);
  const d = desafios.find((x) => x.id === ativo) ?? desafios[0];
  const t = TONE_DESAFIO[d.tone];

  return (
    <section aria-label="Meus desafios" className="space-y-2">
      <div className="flex items-baseline justify-between">
        <h3 className="font-display text-sm uppercase tracking-tight text-ink">Meus desafios</h3>
        <span className="text-[11px] font-bold uppercase tracking-widest text-ink/50">{desafios.length} ativo{desafios.length !== 1 ? "s" : ""}</span>
      </div>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {desafios.map((x) => {
          const on = x.id === ativo;
          return (
            <button key={x.id} type="button" onClick={() => setAtivo(x.id)} aria-pressed={on}
              className={`shrink-0 rounded-full border-2 border-ink px-3 py-1.5 font-display text-[10px] uppercase tracking-tight transition-transform ${on ? "shadow-hard-sm bg-ink text-paper" : "bg-paper text-ink/70 hover:-translate-y-px"}`}>
              {x.nome}
            </button>
          );
        })}
      </div>
      <Link href={`/juntos/${d.id}`} className={`shadow-hard relative block overflow-hidden rounded-2xl border-2 border-ink p-5 transition-transform active:translate-x-1 active:translate-y-1 active:shadow-none ${t.bg}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className={`font-display text-[10px] uppercase tracking-widest ${d.tone === "mustard" ? "text-ink/70" : "text-ink/80"}`}>Você está no</p>
            <h3 className={`mt-1 font-serif text-2xl font-bold italic leading-tight ${t.title}`}>{d.emoji} {d.nome}</h3>
          </div>
          <div className={`shadow-hard-sm shrink-0 rounded-full border-2 border-ink px-3 py-2 text-center ${t.chip}`}>
            <p className="font-display text-lg leading-none">→</p>
          </div>
        </div>
      </Link>
    </section>
  );
}

function CompartilharBtn() {
  return (
    <Link href="/metas" className="shadow-hard flex w-full items-center justify-between rounded-xl border-2 border-ink bg-navy px-6 py-4 text-paper transition-transform active:translate-x-1 active:translate-y-1 active:shadow-none">
      <span className="font-display text-xs uppercase tracking-widest">Ver todas as metas</span>
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12h14M12 5l7 7-7 7" />
      </svg>
    </Link>
  );
}
