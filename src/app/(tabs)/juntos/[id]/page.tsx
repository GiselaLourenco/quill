"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { desafiosAtivos, type Desafio, type MembroDesafio } from "@/lib/mock-desafios";

/* ---------- token maps ---------- */

const MEMBRO_BG: Record<MembroDesafio["cor"], string> = {
  coral: "bg-coral text-paper",
  moss: "bg-moss text-paper",
  mustard: "bg-mustard text-ink",
  navy: "bg-navy text-paper",
  "cover-1": "bg-cover-1 text-ink",
  "cover-2": "bg-cover-2 text-ink",
  "cover-3": "bg-cover-3 text-ink",
  "cover-4": "bg-cover-4 text-paper",
};

/* ---------- mock data para detalhe ---------- */

type CheckinDia = {
  data: number;
  label: string;
  estado: "vazio" | "feito" | "hoje" | "hoje-feito";
};

type AtividadeItem = {
  id: string;
  membro: string;
  cor: MembroDesafio["cor"];
  tipo: "checkin" | "milestone" | "comentario";
  texto: string;
  comentario?: string;
  quando: string;
};

type Podio = { membro: string; cor: MembroDesafio["cor"]; metrica: string };
type RankingItem = { posicao: number; membro: string; cor: MembroDesafio["cor"]; metrica: string; ehVoce: boolean };
type DiaMes = { data: number; estado: "vazio" | "feito" | "hoje" | "fora" };

function buildMockDetalhe(desafio: Desafio) {
  const semana: CheckinDia[] = [
    { data: 15, label: "S", estado: "vazio" },
    { data: 16, label: "T", estado: "feito" },
    { data: 17, label: "Q", estado: "feito" },
    { data: 18, label: "Q", estado: "hoje" },
    { data: 19, label: "S", estado: "vazio" },
    { data: 20, label: "S", estado: "vazio" },
    { data: 21, label: "D", estado: "vazio" },
  ];

  const HOJE = 18;
  const FEITOS = new Set([1, 2, 4, 5, 8, 9, 10, 11, 12, 16, 17]);
  const mes: DiaMes[] = Array.from({ length: 31 }, (_, i) => {
    const d = i + 1;
    let estado: DiaMes["estado"] = "vazio";
    if (d === HOJE) estado = "hoje";
    else if (FEITOS.has(d)) estado = "feito";
    return { data: d, estado };
  });
  const offsetMarco = 5;
  const totalFeitos = FEITOS.size;

  const podio: Podio[] = [
    { membro: "Rafa", cor: "coral", metrica: "312 pgs" },
    { membro: "Maria", cor: "moss", metrica: "380 pgs" },
    { membro: "Você", cor: "navy", metrica: desafio.minhaPosicao > 0 ? "280 pgs" : "—" },
  ];

  const rankingCompleto: RankingItem[] = [
    { posicao: 1, membro: "Maria", cor: "moss", metrica: "380 pgs", ehVoce: false },
    { posicao: 2, membro: "Rafa", cor: "coral", metrica: "312 pgs", ehVoce: false },
    { posicao: 3, membro: "João", cor: "cover-3", metrica: "298 pgs", ehVoce: false },
    { posicao: 4, membro: "Bia", cor: "mustard", metrica: "285 pgs", ehVoce: false },
    { posicao: 5, membro: "Você", cor: "navy", metrica: "280 pgs", ehVoce: true },
  ];

  const atividade: AtividadeItem[] = [
    { id: "a1", membro: "Maria", cor: "moss", tipo: "checkin", texto: "leu 42 pgs", quando: "Há 2 horas" },
    {
      id: "a2",
      membro: "Rafa",
      cor: "coral",
      tipo: "comentario",
      texto: "comentou no Cap. 8",
      comentario: "Gente, aquela cena do labirinto me destruiu. Precisei parar e respirar.",
      quando: "Há 5 horas",
    },
    { id: "a3", membro: "João", cor: "cover-3", tipo: "checkin", texto: "check-in de 20 pgs", quando: "Ontem" },
    { id: "a4", membro: "Bia", cor: "mustard", tipo: "milestone", texto: "chegou à metade do livro", quando: "Ontem" },
    {
      id: "a5",
      membro: "Você",
      cor: "navy",
      tipo: "comentario",
      texto: "comentou no Cap. 7",
      comentario: "O ritmo mudou completamente. Alguém mais achou?",
      quando: "2 dias atrás",
    },
    { id: "a6", membro: "Maria", cor: "moss", tipo: "checkin", texto: "leu 30 pgs", quando: "2 dias atrás" },
    { id: "a7", membro: "Rafa", cor: "coral", tipo: "milestone", texto: "completou Cap. 6", quando: "3 dias atrás" },
  ];

  const codigoConvite = desafio.id.slice(0, 6).toUpperCase().padEnd(6, "X") + "24";

  return { semana, mes, offsetMarco, totalFeitos, podio, rankingCompleto, atividade, codigoConvite };
}

/* ---------- página ---------- */

export default function DesafioDetalhe({ params }: { params: { id: string } }) {
  const desafio = desafiosAtivos.find((d) => d.id === params.id);

  if (!desafio) {
    return (
      <div className="min-h-full bg-paper px-4 pt-10 text-center">
        <p className="font-serif italic text-ink">Desafio não encontrado.</p>
        <Link href="/juntos" className="mt-4 inline-block border-2 border-ink bg-ink px-4 py-2 font-display text-xs uppercase tracking-widest text-paper">
          Voltar
        </Link>
      </div>
    );
  }

  return <DesafioDetalheContent desafio={desafio} />;
}

function DesafioDetalheContent({ desafio }: { desafio: Desafio }) {
  const { semana, mes, offsetMarco, totalFeitos, podio, rankingCompleto, atividade, codigoConvite } = useMemo(
    () => buildMockDetalhe(desafio),
    [desafio],
  );

  const progresso = useMemo(() => {
    if (desafio.diasTotais === 0) return 0;
    return Math.min(100, Math.round((desafio.diasDecorridos / desafio.diasTotais) * 100));
  }, [desafio]);

  const diasRestantes = Math.max(0, desafio.diasTotais - desafio.diasDecorridos);
  const [checkinFeito, setCheckinFeito] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [rankingAberto, setRankingAberto] = useState(false);
  const [verMais, setVerMais] = useState(false);
  const atividadeVisivel = verMais ? atividade : atividade.slice(0, 3);

  const copiarCodigo = async () => {
    try {
      await navigator.clipboard.writeText(codigoConvite);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch { /* ignore */ }
  };

  return (
    <div className="relative min-h-full bg-paper pb-28">
      {/* Header */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b-2 border-ink bg-paper px-4 py-3">
        <div className="flex items-center gap-3">
          <Link
            href="/juntos"
            aria-label="Voltar"
            className="flex h-9 w-9 items-center justify-center border-2 border-ink bg-paper shadow-hard-sm active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="m15 18-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <h1 className="font-display text-lg uppercase leading-none text-ink">
            {desafio.emoji} {desafio.nome}
          </h1>
        </div>
      </header>

      {/* Progresso do prazo */}
      <section className="px-4 pt-5">
        <div className="mb-2 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="inline-block border-2 border-ink bg-mustard px-2 py-0.5 font-display text-[10px] uppercase tracking-widest text-ink">
              VOCÊ: {desafio.minhaPosicao > 0 ? `${desafio.minhaPosicao}º LUGAR` : "OBSERVANDO"}
            </span>
            <h2 className="mt-2 font-serif text-2xl italic leading-tight text-ink">
              Faltam {diasRestantes} dias
            </h2>
          </div>
          <div className="text-right">
            <span className="block font-display text-2xl leading-none text-ink">{progresso}%</span>
            <span className="mt-1 block font-display text-[9px] uppercase tracking-widest text-ink-soft">
              concluído
            </span>
          </div>
        </div>
        <div className="h-5 w-full border-2 border-ink bg-paper shadow-hard-sm">
          <div className="h-full border-r-2 border-ink bg-moss transition-all" style={{ width: `${progresso}%` }} />
        </div>
      </section>

      {/* Semana */}
      <section className="px-4 pt-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-[10px] uppercase tracking-widest text-ink">
            Meus check-ins · Semana
          </h3>
        </div>
        <div className="flex justify-between gap-1">
          {semana.map((d) => {
            const isHoje = d.estado === "hoje" || d.estado === "hoje-feito";
            const preenchido = d.estado === "feito" || d.estado === "hoje-feito";
            return (
              <div key={d.data} className={`flex flex-1 flex-col items-center gap-1 ${isHoje ? "scale-110" : ""}`}>
                <span className={`font-display text-[9px] uppercase tracking-wider ${isHoje ? "text-coral" : "text-ink-soft"}`}>
                  {d.label}
                </span>
                <div
                  className={[
                    "flex aspect-square w-full items-center justify-center border-2 border-ink text-xs font-black",
                    preenchido ? "bg-moss text-paper" : "bg-paper text-ink",
                    isHoje ? "border-[3px] bg-mustard text-ink shadow-hard-sm" : "",
                  ].join(" ")}
                >
                  {d.data}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Ranking - pódio */}
      <section className="px-4 pt-6">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-display text-sm uppercase tracking-wider text-ink">RANKING</h2>
          <button
            onClick={() => setRankingAberto(true)}
            className="font-display text-[10px] uppercase tracking-widest text-ink underline decoration-2 underline-offset-2"
          >
            VER TUDO
          </button>
        </div>
        <div className="flex h-32 items-end justify-between gap-2">
          <PodioColuna posicao={2} membro={podio[0]} altura="h-12" bg="bg-paper" />
          <PodioColuna posicao={1} membro={podio[1]} altura="h-20" bg="bg-mustard" destaque />
          <PodioColuna posicao={3} membro={podio[2]} altura="h-10" bg="bg-paper" />
        </div>
      </section>

      {/* Feed */}
      <section className="px-4 pt-8">
        <h2 className="mb-3 font-display text-sm uppercase tracking-wider text-ink">Atividade recente</h2>
        <ul className="space-y-2">
          {atividadeVisivel.map((a) => (
            <li key={a.id} className="border-2 border-ink bg-paper p-3 shadow-hard-sm">
              <div className="flex items-start gap-3">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center border-2 border-ink ${MEMBRO_BG[a.cor]}`}>
                  {a.tipo === "comentario" ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M21 12a8 8 0 0 1-11.5 7.2L4 21l1.8-5A8 8 0 1 1 21 12z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : a.tipo === "milestone" ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M12 2l2.9 6 6.6.6-5 4.5 1.5 6.5L12 16l-6 3.6 1.5-6.5-5-4.5 6.6-.6z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] leading-tight text-ink">
                    <span className="font-display text-[11px] uppercase tracking-wider">{a.membro}</span>{" "}
                    {a.texto}
                  </p>
                  <span className="mt-1 block font-display text-[9px] uppercase tracking-widest text-ink-soft">
                    {a.quando}
                  </span>
                </div>
              </div>
              {a.tipo === "comentario" && a.comentario && (
                <div className="relative mt-3 ml-11 border-2 border-ink bg-mustard/40 p-3">
                  <span aria-hidden className="absolute -top-[7px] left-4 h-3 w-3 rotate-45 border-t-2 border-l-2 border-ink bg-mustard/40" />
                  <p className="font-serif text-[13px] italic leading-snug text-ink">
                    &ldquo;{a.comentario}&rdquo;
                  </p>
                </div>
              )}
            </li>
          ))}
        </ul>
        {atividade.length > 3 && (
          <button
            onClick={() => setVerMais((v) => !v)}
            className="mt-3 w-full border-2 border-ink bg-paper py-2 font-display text-[10px] uppercase tracking-widest text-ink shadow-hard-sm active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
          >
            {verMais ? "Ver menos" : `Ver mais (${atividade.length - 3})`}
          </button>
        )}
      </section>

      {/* Convite + Regras */}
      <section className="px-4 pt-6">
        <div className="flex items-center justify-between border-2 border-ink bg-navy p-3 text-paper shadow-hard">
          <div className="min-w-0">
            <p className="font-display text-[9px] uppercase tracking-widest text-paper/70">Código de convite</p>
            <p className="font-display text-lg uppercase tracking-widest">{codigoConvite}</p>
          </div>
          <button
            onClick={copiarCodigo}
            className="shrink-0 border-2 border-ink bg-mustard px-3 py-2 font-display text-[10px] uppercase tracking-widest text-ink active:translate-x-[1px] active:translate-y-[1px]"
          >
            {copiado ? "Copiado" : "Copiar"}
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="border-2 border-ink bg-paper p-2">
            <span className="block font-display text-[9px] uppercase tracking-widest text-ink-soft">Métrica</span>
            <span className="font-serif text-sm italic text-ink">Páginas</span>
          </div>
          <div className="border-2 border-ink bg-paper p-2">
            <span className="block font-display text-[9px] uppercase tracking-widest text-ink-soft">Duração</span>
            <span className="font-serif text-sm italic text-ink">{desafio.diasTotais} dias</span>
          </div>
        </div>
      </section>

      {/* CTA fixo */}
      <div className="pointer-events-none fixed inset-x-0 bottom-16 z-30 mx-auto max-w-[430px] px-4 pt-8">
        <button
          onClick={() => setCheckinFeito((v) => !v)}
          className={[
            "pointer-events-auto w-full border-2 border-ink py-4 font-display text-sm uppercase tracking-widest shadow-hard active:translate-x-[2px] active:translate-y-[2px] active:shadow-none",
            checkinFeito ? "bg-moss text-paper" : "bg-coral text-paper",
          ].join(" ")}
        >
          {checkinFeito ? "Check-in feito ✓" : "Fazer check-in de hoje"}
        </button>
      </div>

      {/* Modal: ranking completo */}
      {rankingAberto && (
        <RankingModal
          ranking={rankingCompleto}
          totalMembros={desafio.totalMembros}
          onClose={() => setRankingAberto(false)}
        />
      )}
    </div>
  );
}

/* ---------- pódio coluna ---------- */

function PodioColuna({
  posicao,
  membro,
  altura,
  bg,
  destaque = false,
}: {
  posicao: number;
  membro: Podio;
  altura: string;
  bg: string;
  destaque?: boolean;
}) {
  return (
    <div className="flex flex-1 flex-col items-center">
      <div
        className={`relative mb-1 flex items-center justify-center rounded-full border-2 border-ink text-[11px] font-black ${
          destaque ? "h-14 w-14" : "h-11 w-11"
        } ${MEMBRO_BG[membro.cor]}`}
      >
        {membro.membro.slice(0, 2).toUpperCase()}
        {destaque && (
          <span className="absolute -top-2 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 border-2 border-ink bg-coral" />
        )}
      </div>
      <div
        className={`flex w-full flex-col items-center justify-center border-2 border-ink shadow-hard-sm ${altura} ${bg}`}
      >
        <span className="font-display text-[11px] uppercase leading-none text-ink">{posicao}º</span>
        <span className="mt-0.5 font-display text-[9px] uppercase tracking-widest text-ink-soft">
          {membro.metrica}
        </span>
      </div>
    </div>
  );
}

/* ---------- modal ranking completo ---------- */

function RankingModal({
  ranking,
  totalMembros,
  onClose,
}: {
  ranking: RankingItem[];
  totalMembros: number;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/60 px-4 pb-6 pt-16 sm:items-center"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-[380px] flex-col border-2 border-ink bg-paper shadow-hard"
      >
        <div className="flex items-center justify-between border-b-2 border-ink px-4 py-3">
          <button
            onClick={onClose}
            aria-label="Voltar"
            className="flex h-8 w-8 items-center justify-center border-2 border-ink bg-paper shadow-hard-sm active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="m15 18-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <h3 className="font-serif text-lg italic leading-none text-ink">Ranking completo</h3>
          <span className="font-display text-[9px] uppercase tracking-widest text-ink-soft">
            {totalMembros || ranking.length}
          </span>
        </div>

        <ol className="flex-1 divide-y-2 divide-ink overflow-y-auto">
          {ranking.map((r) => (
            <li
              key={r.posicao}
              className={[
                "flex items-center gap-3 px-4 py-3",
                r.ehVoce ? "bg-mustard/40" : "bg-paper",
              ].join(" ")}
            >
              <span
                className={[
                  "flex h-8 w-8 shrink-0 items-center justify-center border-2 border-ink font-display text-[12px]",
                  r.posicao === 1
                    ? "bg-mustard text-ink"
                    : r.posicao === 2
                      ? "bg-cover-2 text-ink"
                      : r.posicao === 3
                        ? "bg-coral text-paper"
                        : "bg-paper text-ink",
                ].join(" ")}
              >
                {r.posicao}
              </span>
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-ink text-[11px] font-black ${MEMBRO_BG[r.cor]}`}
              >
                {r.membro.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-[12px] uppercase tracking-wider text-ink">
                  {r.membro}
                  {r.ehVoce && (
                    <span className="ml-2 border-2 border-ink bg-ink px-1.5 py-0.5 font-display text-[8px] uppercase tracking-widest text-paper">
                      Você
                    </span>
                  )}
                </p>
              </div>
              <span className="shrink-0 font-display text-[11px] uppercase tracking-widest text-ink-soft">
                {r.metrica}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
