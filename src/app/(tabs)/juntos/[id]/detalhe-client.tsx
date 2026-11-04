"use client";

import Image from "next/image";
import { ConvidarAmigoDesafio, type AmigoConvidavel } from "@/components/convidar-amigo-desafio";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { CheckinSheet, type LivroLendo } from "@/components/checkin-sheet";
import { comentarCheckin } from "@/app/actions/checkins";
import { CheckinCard, type CheckinDetalhe, type ComentarCheckin, type MembroCor } from "./checkin-card";
import { DiaGrupoSheet } from "./dia-grupo-sheet";
import { SegmentToggle } from "@/components/segment-toggle";
import { leaveChallenge } from "@/app/actions/groups";
import { avatarDeExibicao, AVATAR_FUNDO_PADRAO } from "@/lib/avatares";
import { todayLocalDateKey } from "@/lib/date-br";
import { ComSpinner } from "@/components/carregando";

const MES_LABEL = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
const DIAS_SEMANA_LABEL = ["D", "S", "T", "Q", "Q", "S", "S"];

// Visão do mês: quantos pontos cabem numa linha da célula (~35px úteis a
// 390px de largura) e quantos nomes a legenda mostra antes do "+N".
const MAX_PONTOS_DIA = 4;
const MAX_NOMES_LEGENDA = 6;

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

type Avatar = { avatarUrl: string | null; avatarZoom: number; avatarBg: string };
type SemanaItem = { chave: string; data: number; label: string; estado: "vazio" | "feito" | "hoje" | "hoje-feito" };
type RankingItem = Avatar & { posicao: number; userId: string; nome: string; metrica: string; ehVoce: boolean };

type Group = {
  id: string; nome: string; metric: string; unit: string;
  diasRestantes: number; progresso: number; minhaPosicao: number; codigoConvite: string;
  encerrado: boolean;
  naoComecou: boolean;
  comecaEm: string | null;
  metricaLabel: string;
  duracaoDias: number | null;
};

/** Foto de quem está no desafio — a mesma escolhida no perfil. */
function AvatarMembro({
  nome, avatarUrl, avatarZoom, avatarBg, tamanho, className = "",
}: Avatar & { nome: string; tamanho: number; className?: string }) {
  const arte = avatarDeExibicao(avatarUrl);
  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-ink ${className}`}
      style={{ height: tamanho, width: tamanho, backgroundColor: avatarBg || AVATAR_FUNDO_PADRAO }}
    >
      <Image
        src={arte.src}
        alt={nome}
        width={tamanho}
        height={tamanho}
        className={`h-full w-full ${arte.foto ? "object-cover" : "object-contain"}`}
        style={{ transform: `scale(${avatarZoom / 100})` }}
        draggable={false}
      />
    </div>
  );
}

export default function DesafioDetalheClient({
  group, semana, ranking, checkins, livros, amigosConvidaveis, membros, demo = false,
}: {
  membros: MembroCor[];
  /** Todos os check-ins do desafio, do mais recente pro mais antigo. */
  checkins: CheckinDetalhe[];
  /** /juntos/demo: comentar fica só na tela, nada vai pro banco. */
  demo?: boolean;
  amigosConvidaveis: AmigoConvidavel[];
  group: Group;
  semana: SemanaItem[];
  ranking: RankingItem[];
  livros: LivroLendo[];
}) {
  const router = useRouter();
  const [checkinFeito, setCheckinFeito] = useState(false);
  const [checkinAberto, setCheckinAberto] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [rankingAberto, setRankingAberto] = useState(false);
  const [verMais, setVerMais] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false);
  const [confirmarSaida, setConfirmarSaida] = useState(false);
  const [saindo, startSaida] = useTransition();

  const [visaoCheckins, setVisaoCheckins] = useState<"semana" | "mes">("semana");
  const hoje = new Date();
  const [mesAno, setMesAno] = useState({ ano: hoje.getFullYear(), mes: hoje.getMonth() + 1 });

  // Dia tocado na semana ou no mês — abre os check-ins de todo mundo nele.
  const [diaAberto, setDiaAberto] = useState<string | null>(null);
  const hojeChave = todayLocalDateKey();

  // Chip de pessoa na visão do mês: null = todos.
  const [filtro, setFiltro] = useState<string | null>(null);
  const [legendaCompleta, setLegendaCompleta] = useState(false);
  const eu = membros.find((m) => m.ehVoce);
  const meuNome = eu?.nome ?? "Você";
  const minhaCor = eu?.cor ?? "#6b6152";

  // dia → check-ins de todo mundo (painel do dia); e os dias em que eu li
  // (quadrado verde no calendário).
  const { checkinsPorDia, diasComCheckin } = useMemo(() => {
    const porDia = new Map<string, CheckinDetalhe[]>();
    const meus = new Set<string>();
    for (const c of checkins) {
      for (const dia of c.dias ?? [c.dia]) {
        porDia.set(dia, [...(porDia.get(dia) ?? []), c]);
        if (eu && c.userId === eu.userId) meus.add(dia);
      }
    }
    return { checkinsPorDia: porDia, diasComCheckin: meus };
  }, [checkins, eu]);

  // Visão do mês: dia → quem leu (você primeiro, depois na ordem do ranking).
  const pontosPorDia = useMemo(() => {
    const ordem = new Map(membros.map((m, i) => [m.userId, m.ehVoce ? -1 : i]));
    const mapa = new Map<string, MembroCor[]>();
    for (const c of checkins) {
      if (filtro && c.userId !== filtro) continue;
      const m = membros.find((x) => x.userId === c.userId);
      for (const dia of c.dias ?? [c.dia]) {
        const lista = mapa.get(dia) ?? [];
        if (m && !lista.some((x) => x.userId === m.userId)) lista.push(m);
        mapa.set(dia, lista);
      }
    }
    for (const l of mapa.values()) l.sort((a, b) => (ordem.get(a.userId) ?? 0) - (ordem.get(b.userId) ?? 0));
    return mapa;
  }, [checkins, membros, filtro]);
  const nomeChip = (m: MembroCor) => (m.ehVoce ? "Você" : m.nome);

  const comentar: ComentarCheckin = async (checkinId, texto, gifUrl) => {
    if (demo) return null;
    const { error } = await comentarCheckin({ checkinId, groupId: group.id, content: texto, gifUrl });
    if (!error) router.refresh();
    return error;
  };

  const limiteInicio = group.comecaEm ? group.comecaEm.slice(0, 7) : null; // "YYYY-MM"
  const limiteFim = `${hoje.getFullYear()}-${pad2(hoje.getMonth() + 1)}`;
  const mesAtualChave = `${mesAno.ano}-${pad2(mesAno.mes)}`;
  const podeMesAnterior = !limiteInicio || mesAtualChave > limiteInicio;
  const podeProximoMes = mesAtualChave < limiteFim;

  const mudarMes = (delta: number) => {
    setMesAno(({ ano, mes }) => {
      const base = new Date(ano, mes - 1 + delta, 1);
      return { ano: base.getFullYear(), mes: base.getMonth() + 1 };
    });
  };

  const celulasDoMes = useMemo(() => {
    const { ano, mes } = mesAno;
    const offset = new Date(ano, mes - 1, 1).getDay();
    const diasNoMes = new Date(ano, mes, 0).getDate();
    const hojeChave = todayLocalDateKey();
    const celulas: { chave: string; dia: number; feito: boolean; hoje: boolean }[] = [];
    for (let dia = 1; dia <= diasNoMes; dia++) {
      const chave = `${ano}-${pad2(mes)}-${pad2(dia)}`;
      celulas.push({ chave, dia, feito: diasComCheckin.has(chave), hoje: chave === hojeChave });
    }
    const sobra = (7 - ((offset + diasNoMes) % 7)) % 7;
    return { offset, celulas, sobra };
  }, [mesAno, diasComCheckin]);

  const atividade = checkins.slice(0, 20);
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
          <h1 className="font-display text-lg uppercase leading-none text-ink">{group.nome}</h1>
        </div>

        <div className="relative">
          <button
            type="button"
            aria-label="Opções do desafio"
            aria-expanded={menuAberto}
            onClick={() => setMenuAberto((v) => !v)}
            className="shadow-hard-sm flex h-9 w-9 items-center justify-center border-2 border-ink bg-paper active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <circle cx="12" cy="5" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="12" cy="19" r="2" />
            </svg>
          </button>
          {menuAberto && (
            <>
              <button
                type="button"
                aria-label="Fechar menu"
                className="fixed inset-0 z-10 bg-transparent"
                onClick={() => setMenuAberto(false)}
              />
              <div className="shadow-hard absolute right-0 top-full z-20 mt-2 w-44 border-2 border-ink bg-card p-1">
                <button
                  type="button"
                  onClick={() => {
                    setMenuAberto(false);
                    setConfirmarSaida(true);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left font-display text-xs uppercase tracking-wider text-ink hover:bg-coral hover:text-paper"
                >
                  <span aria-hidden>🚪</span> Sair do desafio
                </button>
              </div>
            </>
          )}
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

      {/* Meus check-ins (verde = eu li); tocar no dia mostra os de todo mundo */}
      <section className="px-4 pt-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-[10px] uppercase tracking-widest text-ink">Meus check-ins</h3>
          <SegmentToggle
            ariaLabel="Ver check-ins por semana ou por mês"
            value={visaoCheckins}
            onChange={setVisaoCheckins}
            options={[
              { value: "semana", label: "Semana" },
              { value: "mes", label: "Mês" },
            ]}
          />
        </div>

        {visaoCheckins === "semana" ? (
          <div className="flex justify-between gap-1">
            {semana.map((d) => {
              const isHoje = d.estado === "hoje" || d.estado === "hoje-feito";
              const preenchido = d.estado === "feito" || d.estado === "hoje-feito";
              return (
                <div key={d.data} className={`flex flex-1 flex-col items-center gap-1 ${isHoje ? "scale-110" : ""}`}>
                  <span className={`font-display text-[9px] uppercase tracking-wider ${isHoje ? "text-coral" : "text-ink-soft"}`}>{d.label}</span>
                  <button
                    type="button"
                    onClick={() => setDiaAberto(d.chave)}
                    disabled={d.chave > hojeChave}
                    aria-label={`Dia ${d.data}${preenchido ? ", com check-in" : ""} — ver check-ins`}
                    className={["flex aspect-square w-full items-center justify-center border-2 border-ink text-xs font-black enabled:active:translate-x-[1px] enabled:active:translate-y-[1px]", preenchido ? "bg-moss text-paper" : "bg-paper text-ink", isHoje ? "border-[3px] bg-mustard text-ink shadow-hard-sm" : ""].join(" ")}
                  >
                    {d.data}
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div>
            <div className="mb-2.5 flex items-center justify-between">
              <button
                type="button"
                onClick={() => mudarMes(-1)}
                disabled={!podeMesAnterior}
                aria-label="Mês anterior"
                className="flex h-7 w-7 items-center justify-center border-2 border-ink bg-paper shadow-hard-sm disabled:opacity-35"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m15 18-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
              <span className="font-serif text-base italic text-ink">{MES_LABEL[mesAno.mes - 1]} {mesAno.ano}</span>
              <button
                type="button"
                onClick={() => mudarMes(1)}
                disabled={!podeProximoMes}
                aria-label="Próximo mês"
                className="flex h-7 w-7 items-center justify-center border-2 border-ink bg-paper shadow-hard-sm disabled:opacity-35"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m9 18 6-6-6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            </div>

            {membros.length > 1 && (
              // Uma linha só, rolando de lado — com 10+ pessoas os chips
              // quebrariam em várias linhas e empurrariam o calendário.
              <div className="-mx-4 mb-3 flex gap-1.5 overflow-x-auto px-4 pb-1.5">
                {[null, ...membros.map((m) => m.userId)].map((uid) => {
                  const m = uid ? membros.find((x) => x.userId === uid)! : null;
                  const ativo = filtro === uid;
                  return (
                    <button
                      key={uid ?? "todos"}
                      type="button"
                      onClick={() => setFiltro(uid)}
                      aria-pressed={ativo}
                      className={`shadow-hard-sm shrink-0 border-2 border-ink px-2.5 py-1 font-display text-[9px] uppercase tracking-widest active:translate-x-[1px] active:translate-y-[1px] active:shadow-none ${
                        ativo ? "bg-moss text-paper" : "bg-paper text-ink"
                      }`}
                    >
                      {m ? nomeChip(m) : "Todos"}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="grid grid-cols-7 gap-1">
              {DIAS_SEMANA_LABEL.map((l, i) => (
                <span key={i} className="text-center font-display text-[9px] uppercase text-ink-soft">{l}</span>
              ))}
              {Array.from({ length: celulasDoMes.offset }, (_, i) => (
                <span key={`v-${i}`} className="aspect-square border-2 border-dashed border-ink/20" />
              ))}
              {celulasDoMes.celulas.map((c) => {
                const quem = pontosPorDia.get(c.chave) ?? [];
                // Até MAX_PONTOS_DIA cabe tudo; passou disso, um ponto a menos + "+N".
                const visiveis = quem.length > MAX_PONTOS_DIA ? quem.slice(0, MAX_PONTOS_DIA - 1) : quem;
                const resto = quem.length - visiveis.length;
                return (
                  <button
                    type="button"
                    key={c.chave}
                    onClick={() => setDiaAberto(c.chave)}
                    disabled={c.chave > hojeChave}
                    aria-label={`Dia ${c.dia}: ${quem.map(nomeChip).join(", ") || "sem check-in"} — ver check-ins`}
                    className={`flex aspect-square flex-col justify-between border-2 bg-paper p-1 text-left enabled:active:translate-x-[1px] enabled:active:translate-y-[1px] disabled:opacity-50 ${c.hoje ? "border-coral" : "border-ink"}`}
                  >
                    {/* número em cima, uma linha de pontos embaixo — nunca quebra */}
                    <span className="block font-display text-[10px] leading-none text-ink">{c.dia}</span>
                    {quem.length > 0 && (
                      <span className="flex flex-nowrap items-center justify-center gap-[2px] overflow-hidden">
                        {visiveis.map((m) => (
                          <i key={m.userId} className="h-[6px] w-[6px] shrink-0 rounded-full border border-ink" style={{ backgroundColor: m.cor }} />
                        ))}
                        {resto > 0 && (
                          <span className="shrink-0 font-display text-[7px] leading-none text-ink-soft">+{resto}</span>
                        )}
                      </span>
                    )}
                  </button>
                );
              })}
              {Array.from({ length: celulasDoMes.sobra }, (_, i) => (
                <span key={`f-${i}`} className="aspect-square border-2 border-dashed border-ink/20" />
              ))}
            </div>

            {membros.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                {(legendaCompleta ? membros : membros.slice(0, MAX_NOMES_LEGENDA)).map((m) => (
                  <span key={m.userId} className="inline-flex items-center gap-1.5 font-display text-[9px] uppercase tracking-widest text-ink">
                    <i className="h-2.5 w-2.5 rounded-full border border-ink" style={{ backgroundColor: m.cor }} />
                    {nomeChip(m)}
                  </span>
                ))}
                {membros.length > MAX_NOMES_LEGENDA && (
                  <button
                    type="button"
                    onClick={() => setLegendaCompleta((v) => !v)}
                    className="font-display text-[9px] uppercase tracking-widest text-ink-soft underline underline-offset-2"
                  >
                    {legendaCompleta ? "menos" : `+${membros.length - MAX_NOMES_LEGENDA}`}
                  </button>
                )}
              </div>
            )}
            <p className="mt-2 font-serif text-[11px] italic text-ink-soft">
              Cada ponto = um membro com check-in no dia. Filtre por pessoa nos chips acima.
            </p>
          </div>
        )}
        {diaAberto && (
          <DiaGrupoSheet
            key={diaAberto}
            chave={diaAberto}
            hoje={diaAberto === hojeChave}
            checkins={checkinsPorDia.get(diaAberto) ?? []}
            comentar={comentar}
            meuNome={meuNome}
            minhaCor={minhaCor}
            onClose={() => setDiaAberto(null)}
          />
        )}
      </section>

      {/* Ranking */}
      {ranking.length > 0 && (
        <section className="px-4 pt-6">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-display text-sm uppercase tracking-wider text-ink">RANKING</h2>
            <button onClick={() => setRankingAberto(true)} className="font-display text-[10px] uppercase tracking-widest text-ink underline decoration-2 underline-offset-2">VER TUDO</button>
          </div>
          <div className="flex h-32 items-end justify-between gap-2">
            {podio.length >= 2 && <PodioColuna membro={podio[1]} posicao={2} altura="h-12" bg="bg-paper" />}
            {podio.length >= 1 && <PodioColuna membro={podio[0]} posicao={1} altura="h-20" bg="bg-mustard" destaque />}
            {podio.length >= 3 && <PodioColuna membro={podio[2]} posicao={3} altura="h-10" bg="bg-paper" />}
          </div>
        </section>
      )}

      {/* Feed */}
      {atividade.length > 0 && (
        <section className="px-4 pt-8">
          <h2 className="mb-3 font-display text-sm uppercase tracking-wider text-ink">Atividade recente</h2>
          <ul className="space-y-2">
            {atividadeVisivel.map((c) => (
              <li key={c.id}>
                <CheckinCard c={c} comentar={comentar} meuNome={meuNome} minhaCor={minhaCor} />
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

        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="border-2 border-ink bg-paper px-3 py-2.5">
            <p className="font-display text-[9px] uppercase tracking-widest text-ink-soft">Métrica</p>
            <p className="mt-1 font-serif text-lg italic leading-tight text-ink">{group.metricaLabel}</p>
          </div>
          <div className="border-2 border-ink bg-paper px-3 py-2.5">
            <p className="font-display text-[9px] uppercase tracking-widest text-ink-soft">Duração</p>
            <p className="mt-1 font-serif text-lg italic leading-tight text-ink">
              {group.duracaoDias ? `${group.duracaoDias} ${group.duracaoDias === 1 ? "dia" : "dias"}` : "Sem prazo"}
            </p>
          </div>
        </div>

        {/* O código serve pra quem está fora da sua lista; pra quem já é amigo
            aqui, chamar direto poupa sair do app e voltar. */}
        <ConvidarAmigoDesafio groupId={group.id} amigos={amigosConvidaveis} />
      </section>

      {/* CTA fixo */}
      <div className="pointer-events-none fixed inset-x-0 bottom-16 z-30 mx-auto max-w-[430px] px-4 pt-8">
        {group.encerrado ? (
          <div className="pointer-events-auto w-full border-2 border-ink bg-paper py-3.5 text-center shadow-hard">
            <p className="font-display text-sm uppercase tracking-widest text-ink-soft">
              Desafio encerrado
            </p>
            <p className="mt-0.5 font-serif text-xs italic text-ink-soft">
              dá pra rever tudo, mas não dá mais pra fazer check-in
            </p>
          </div>
        ) : group.naoComecou ? (
          <div className="pointer-events-auto w-full border-2 border-ink bg-paper py-3.5 text-center shadow-hard">
            <p className="font-display text-sm uppercase tracking-widest text-ink-soft">
              Ainda não começou
            </p>
            <p className="mt-0.5 font-serif text-xs italic text-ink-soft">
              {group.comecaEm
                ? `o check-in abre em ${group.comecaEm.slice(8, 10)}/${group.comecaEm.slice(5, 7)} — já dá pra convidar`
                : "já dá pra convidar quem vai participar"}
            </p>
          </div>
        ) : (
          <button
            onClick={() => setCheckinAberto(true)}
            className={["pointer-events-auto w-full border-2 border-ink py-3.5 font-display text-sm uppercase leading-tight tracking-widest shadow-hard active:translate-x-[2px] active:translate-y-[2px] active:shadow-none", checkinFeito ? "bg-moss text-paper" : "bg-coral text-paper"].join(" ")}
          >
            {checkinFeito ? (
              <>
                <span className="block">Check-in feito ✓</span>
                <span className="mt-1 block text-[11px] tracking-widest text-paper/85">registrar outro</span>
              </>
            ) : (
              "Fazer check-in de hoje"
            )}
          </button>
        )}
      </div>

      {checkinAberto && !group.encerrado && !group.naoComecou && (
        <CheckinSheet
          groupId={group.id}
          livros={livros}
          onClose={() => setCheckinAberto(false)}
          onFeito={() => {
            setCheckinFeito(true);
            router.refresh();
          }}
        />
      )}

      {confirmarSaida && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-ink/60 p-4 sm:items-center">
          <div className="shadow-hard w-full max-w-sm border-2 border-ink bg-card p-5">
            <p className="font-display text-lg uppercase leading-tight text-ink">Sair do desafio?</p>
            <p className="mt-2 text-sm text-ink-soft">
              Você perderá sua posição no ranking e não poderá voltar sem um novo convite.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmarSaida(false)}
                className="shadow-hard-sm flex-1 border-2 border-ink bg-paper py-3 font-display text-xs uppercase tracking-widest text-ink active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={saindo}
                onClick={() => startSaida(async () => { await leaveChallenge(group.id); })}
                className="shadow-hard-sm flex-1 border-2 border-ink bg-coral py-3 font-display text-xs uppercase tracking-widest text-paper active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-60"
              >
                <ComSpinner ocupado={saindo}>{saindo ? "Saindo…" : "Sair"}</ComSpinner>
              </button>
            </div>
          </div>
        </div>
      )}

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
              {ranking.map((r) => (
                <li key={r.userId} className={["flex items-center gap-3 px-4 py-3", r.ehVoce ? "bg-mustard/40" : "bg-paper"].join(" ")}>
                  <span className={["flex h-8 w-8 shrink-0 items-center justify-center border-2 border-ink font-display text-[12px]", r.posicao === 1 ? "bg-mustard text-ink" : r.posicao === 2 ? "bg-cover-2 text-ink" : r.posicao === 3 ? "bg-coral text-paper" : "bg-paper text-ink"].join(" ")}>{r.posicao}</span>
                  <AvatarMembro
                    nome={r.nome}
                    avatarUrl={r.avatarUrl}
                    avatarZoom={r.avatarZoom}
                    avatarBg={r.avatarBg}
                    tamanho={36}
                  />
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

function PodioColuna({ membro, posicao, altura, bg, destaque = false }: {
  membro: RankingItem; posicao: number;
  altura: string; bg: string; destaque?: boolean;
}) {
  const tamanho = destaque ? 56 : 44;
  return (
    <div className="flex flex-1 flex-col items-center">
      <div className="relative mb-1">
        <AvatarMembro
          nome={membro.nome}
          avatarUrl={membro.avatarUrl}
          avatarZoom={membro.avatarZoom}
          avatarBg={membro.avatarBg}
          tamanho={tamanho}
        />
        {destaque && <span className="absolute -top-2 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 border-2 border-ink bg-coral" />}
      </div>
      <div className={`flex w-full flex-col items-center justify-center border-2 border-ink shadow-hard-sm ${altura} ${bg}`}>
        <span className="font-display text-[11px] uppercase leading-none text-ink">{posicao}º</span>
        <span className="mt-0.5 font-display text-[9px] uppercase tracking-widest text-ink-soft">{membro.metrica}</span>
      </div>
    </div>
  );
}
