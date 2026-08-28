"use client";

import Link from "next/link";
import { useState } from "react";

type SemanaItem = { data: number; label: string; estado: "vazio" | "feito" | "hoje" | "hoje-feito" };
type RankingItem = { posicao: number; userId: string; nome: string; metrica: string; ehVoce: boolean };
type AtividadeItem = { id: string; userId: string; nome: string; texto: string; nota: string | null; quando: string; ehVoce: boolean };

type Group = {
  id: string; nome: string; emoji: string; metric: string; unit: string;
  diasRestantes: number; progresso: number; minhaPosicao: number; codigoConvite: string;
};

const CORES = ["bg-coral text-paper", "bg-moss text-paper", "bg-mustard text-ink", "bg-navy text-paper", "bg-cover-1 text-ink", "bg-cover-2 text-ink", "bg-cover-3 text-ink", "bg-cover-4 text-paper"];

function corPara(index: number) { return CORES[index % CORES.length]; }

export default function DesafioDetalheClient({
  group, semana, ranking, atividade,
}: {
  group: Group;
  semana: SemanaItem[];
  ranking: RankingItem[];
  atividade: AtividadeItem[];
}) {
  const [checkinFeito, setCheckinFeito] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [rankingAberto, setRankingAberto] = useState(false);
  const [verMais, setVerMais] = useState(false);

  const atividadeVisivel = verMais ? atividade : atividade.slice(0, 3);

  const copiarCodigo = async () => {
    try {
      await navigator.clipboard.writeText(group.codigoConvite);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch { /* ignore */ }
  };

  const podio = ranking.slice(0, 3);

  return (
    <div className="relative min-h-full bg-paper pb-28">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b-2 border-ink bg-paper px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/juntos" aria-label="Voltar" className="flex h-9 w-9 items-center justify-center border-2 border-ink bg-paper shadow-hard-sm active:translate-x-[2px] active:translate-y-[2px] active:shadow-none">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m15 18-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </Link>
          <h1 className="font-display text-lg uppercase leading-none text-ink">{group.emoji} {group.nome}</h1>
        </div>
      </header>

      {/* Progresso */}
      <section className="px-4 pt-5">
        <div className="mb-2 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="inline-block border-2 border-ink bg-mustard px-2 py-0.5 font-display text-[10px] uppercase tracking-widest text-ink">
              VOCÊ: {group.minhaPosicao > 0 ? `${group.minhaPosicao}º LUGAR` : "SEM CHECK-IN"}
            </span>
            <h2 className="mt-2 font-serif text-2xl italic leading-tight text-ink">
              {group.diasRestantes > 0 ? `Faltam ${group.diasRestantes} dias` : "Encerrado"}
            </h2>
          </div>
          <div className="text-right">
            <span className="block font-display text-2xl leading-none text-ink">{group.progresso}%</span>
            <span className="mt-1 block font-display text-[9px] uppercase tracking-widest text-ink-soft">concluído</span>
          </div>
        </div>
        <div className="h-5 w-full border-2 border-ink bg-paper shadow-hard-sm">
          <div className="h-full border-r-2 border-ink bg-moss transition-all" style={{ width: `${group.progresso}%` }} />
        </div>
      </section>

      {/* Semana */}
      <section className="px-4 pt-5">
        <h3 className="mb-3 font-display text-[10px] uppercase tracking-widest text-ink">Meus check-ins · Semana</h3>
        <div className="flex justify-between gap-1">
          {semana.map((d) => {
            const isHoje = d.estado === "hoje" || d.estado === "hoje-feito";
            const preenchido = d.estado === "feito" || d.estado === "hoje-feito";
            return (
              <div key={d.data} className={`flex flex-1 flex-col items-center gap-1 ${isHoje ? "scale-110" : ""}`}>
                <span className={`font-display text-[9px] uppercase tracking-wider ${isHoje ? "text-coral" : "text-ink-soft"}`}>{d.label}</span>
                <div className={["flex aspect-square w-full items-center justify-center border-2 border-ink text-xs font-black", preenchido ? "bg-moss text-paper" : "bg-paper text-ink", isHoje ? "border-[3px] bg-mustard text-ink shadow-hard-sm" : ""].join(" ")}>
                  {d.data}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Ranking */}
      {ranking.length > 0 && (
        <section className="px-4 pt-6">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-display text-sm uppercase tracking-wider text-ink">RANKING</h2>
            <button onClick={() => setRankingAberto(true)} className="font-display text-[10px] uppercase tracking-widest text-ink underline decoration-2 underline-offset-2">VER TUDO</button>
          </div>
          <div className="flex h-32 items-end justify-between gap-2">
            {podio.length >= 2 && <PodioColuna posicao={2} nome={podio[1].nome} metrica={podio[1].metrica} cor={corPara(1)} altura="h-12" bg="bg-paper" />}
            {podio.length >= 1 && <PodioColuna posicao={1} nome={podio[0].nome} metrica={podio[0].metrica} cor={corPara(0)} altura="h-20" bg="bg-mustard" destaque />}
            {podio.length >= 3 && <PodioColuna posicao={3} nome={podio[2].nome} metrica={podio[2].metrica} cor={corPara(2)} altura="h-10" bg="bg-paper" />}
          </div>
        </section>
      )}

      {/* Feed */}
      {atividade.length > 0 && (
        <section className="px-4 pt-8">
          <h2 className="mb-3 font-display text-sm uppercase tracking-wider text-ink">Atividade recente</h2>
          <ul className="space-y-2">
            {atividadeVisivel.map((a, i) => (
              <li key={a.id} className="border-2 border-ink bg-paper p-3 shadow-hard-sm">
                <div className="flex items-start gap-3">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center border-2 border-ink font-display text-[11px] font-black rounded-full ${corPara(i)}`}>
                    {a.nome.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] leading-tight text-ink">
                      <span className="font-display text-[11px] uppercase tracking-wider">{a.nome}</span>{" "}{a.texto}
                    </p>
                    <span className="mt-1 block font-display text-[9px] uppercase tracking-widest text-ink-soft">{a.quando}</span>
                  </div>
                </div>
                {a.nota && (
                  <div className="relative mt-3 ml-11 border-2 border-ink bg-mustard/40 p-3">
                    <span aria-hidden className="absolute -top-[7px] left-4 h-3 w-3 rotate-45 border-t-2 border-l-2 border-ink bg-mustard/40" />
                    <p className="font-serif text-[13px] italic leading-snug text-ink">&ldquo;{a.nota}&rdquo;</p>
                  </div>
                )}
              </li>
            ))}
          </ul>
          {atividade.length > 3 && (
            <button onClick={() => setVerMais((v) => !v)} className="mt-3 w-full border-2 border-ink bg-paper py-2 font-display text-[10px] uppercase tracking-widest text-ink shadow-hard-sm active:translate-x-[1px] active:translate-y-[1px] active:shadow-none">
              {verMais ? "Ver menos" : `Ver mais (${atividade.length - 3})`}
            </button>
          )}
        </section>
      )}

      {/* Convite + Regras */}
      <section className="px-4 pt-6">
        <div className="flex items-center justify-between border-2 border-ink bg-navy p-3 text-paper shadow-hard">
          <div className="min-w-0">
            <p className="font-display text-[9px] uppercase tracking-widest text-paper/70">Código de convite</p>
            <p className="font-display text-lg uppercase tracking-widest">{group.codigoConvite}</p>
          </div>
          <button onClick={copiarCodigo} className="shrink-0 border-2 border-ink bg-mustard px-3 py-2 font-display text-[10px] uppercase tracking-widest text-ink active:translate-x-[1px] active:translate-y-[1px]">
            {copiado ? "Copiado" : "Copiar"}
          </button>
        </div>
      </section>

      {/* CTA fixo */}
      <div className="pointer-events-none fixed inset-x-0 bottom-16 z-30 mx-auto max-w-[430px] px-4 pt-8">
        <button
          onClick={() => setCheckinFeito((v) => !v)}
          className={["pointer-events-auto w-full border-2 border-ink py-4 font-display text-sm uppercase tracking-widest shadow-hard active:translate-x-[2px] active:translate-y-[2px] active:shadow-none", checkinFeito ? "bg-moss text-paper" : "bg-coral text-paper"].join(" ")}
        >
          {checkinFeito ? "Check-in feito ✓" : "Fazer check-in de hoje"}
        </button>
      </div>

      {rankingAberto && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/60 px-4 pb-6 pt-16 sm:items-center" onClick={() => setRankingAberto(false)}>
          <div onClick={(e) => e.stopPropagation()} className="flex max-h-[85vh] w-full max-w-[380px] flex-col border-2 border-ink bg-paper shadow-hard">
            <div className="flex items-center justify-between border-b-2 border-ink px-4 py-3">
              <button onClick={() => setRankingAberto(false)} aria-label="Fechar" className="flex h-8 w-8 items-center justify-center border-2 border-ink bg-paper shadow-hard-sm">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m15 18-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
              <h3 className="font-serif text-lg italic leading-none text-ink">Ranking completo</h3>
              <span className="font-display text-[9px] uppercase tracking-widest text-ink-soft">{ranking.length}</span>
            </div>
            <ol className="flex-1 divide-y-2 divide-ink overflow-y-auto">
              {ranking.map((r, i) => (
                <li key={r.userId} className={["flex items-center gap-3 px-4 py-3", r.ehVoce ? "bg-mustard/40" : "bg-paper"].join(" ")}>
                  <span className={["flex h-8 w-8 shrink-0 items-center justify-center border-2 border-ink font-display text-[12px]", r.posicao === 1 ? "bg-mustard text-ink" : r.posicao === 2 ? "bg-cover-2 text-ink" : r.posicao === 3 ? "bg-coral text-paper" : "bg-paper text-ink"].join(" ")}>{r.posicao}</span>
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-ink text-[11px] font-black ${corPara(i)}`}>{r.nome.slice(0, 2).toUpperCase()}</div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-[12px] uppercase tracking-wider text-ink">
                      {r.nome}
                      {r.ehVoce && <span className="ml-2 border-2 border-ink bg-ink px-1.5 py-0.5 font-display text-[8px] uppercase tracking-widest text-paper">Você</span>}
                    </p>
                  </div>
                  <span className="shrink-0 font-display text-[11px] uppercase tracking-widest text-ink-soft">{r.metrica}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}

function PodioColuna({ posicao, nome, metrica, cor, altura, bg, destaque = false }: {
  posicao: number; nome: string; metrica: string; cor: string;
  altura: string; bg: string; destaque?: boolean;
}) {
  return (
    <div className="flex flex-1 flex-col items-center">
      <div className={`relative mb-1 flex items-center justify-center rounded-full border-2 border-ink text-[11px] font-black ${destaque ? "h-14 w-14" : "h-11 w-11"} ${cor}`}>
        {nome.slice(0, 2).toUpperCase()}
        {destaque && <span className="absolute -top-2 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 border-2 border-ink bg-coral" />}
      </div>
      <div className={`flex w-full flex-col items-center justify-center border-2 border-ink shadow-hard-sm ${altura} ${bg}`}>
        <span className="font-display text-[11px] uppercase leading-none text-ink">{posicao}º</span>
        <span className="mt-0.5 font-display text-[9px] uppercase tracking-widest text-ink-soft">{metrica}</span>
      </div>
    </div>
  );
}
