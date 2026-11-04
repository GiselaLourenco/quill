import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/supabase/auth";
import { getActiveChallenges } from "@/lib/challenges";
import {
  computeStreak,
  computeChaptersPerWeek,
  type SessionRow,
} from "@/lib/gamification";
import { anoAtual as anoDasConquistas, datasDeDesbloqueio, loadAchievementData } from "@/lib/achievement-context";
import { evaluateAchievements } from "@/lib/achievements";
import { montarConquistas } from "@/lib/conquistas-view";
import { pillsEscolhidas, pillDisplay, type PillStats } from "@/lib/pills";
import { getNotificacoes } from "@/lib/notificacoes";
import { nomeExibicao } from "@/lib/nome-exibicao";
import { AVATAR_FUNDO_PADRAO } from "@/lib/avatares";
import {
  localDateKey,
  todayLocalDateKey,
  localHour,
  localWeekday,
  segundosPorDiaDaSessao,
  fracaoDaSessaoEntre,
} from "@/lib/date-br";
import { Suspense } from "react";
import { EsqueletoHomeResto } from "@/components/esqueletos";
import { HomeTopo, HomeResto, type Meta, type SemanaDados, type MesCalendario } from "./home-client";

const DIA_LABEL = ["D", "S", "T", "Q", "Q", "S", "S"];
const SEMANAS_VISIVEIS = 5;
const MESES_ANTES = 2;
const MESES_DEPOIS = 2;

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function ddmm(d: Date): string {
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Domingo da semana que contém `d`. */
function domingoDa(d: Date): Date {
  const out = new Date(d);
  out.setDate(out.getDate() - out.getDay());
  out.setHours(0, 0, 0, 0);
  return out;
}

// A home lê as mesmas colunas que `SessionRow` de gamification.ts — é o que
// `computeChaptersPerWeek` espera. Recordes e sequência vêm do histórico
// inteiro (`loadAchievementData`), não desta janela de datas.
type SessionLite = SessionRow;

function paginasDa(s: SessionLite): number {
  return Math.max(0, (s.unit_end ?? 0) - (s.unit_start ?? 0));
}

type Supabase = Awaited<ReturnType<typeof createClient>>;

/**
 * O que o topo da home precisa (saudação + metas), mais o que sai barato das
 * mesmas sessões (pílulas, semanas, meses). O histórico inteiro vem junto e é
 * reaproveitado pelas conquistas.
 */
async function carregarBase(supabase: Supabase, userId: string) {

  // `agora` fica ancorado ao meio-dia do dia local (Brasil), não ao instante
  // cru do servidor (Vercel roda em UTC) — sem isso, a virada de dia da grade
  // de semana/mês acontece 3h cedo demais para quem lê à noite.
  const hoje = todayLocalDateKey();
  const agora = new Date(`${hoje}T12:00:00`);
  const anoAtual = agora.getFullYear();

  // Janela de busca: cobre o ano corrente E os meses/semanas navegáveis,
  // que podem começar antes de 1º de janeiro.
  const inicioAno = `${anoAtual}-01-01`;
  const inicioMeses = iso(new Date(anoAtual, agora.getMonth() - MESES_ANTES, 1));
  const inicioSemanas = iso(
    (() => {
      const d = domingoDa(agora);
      d.setDate(d.getDate() - 7 * (SEMANAS_VISIVEIS - 1));
      return d;
    })(),
  );
  const janelaInicio = [inicioAno, inicioMeses, inicioSemanas].sort()[0]!;

  const [
    { data: profile },
    { data: sessionRows },
    { data: goals },
    { count: livrosTerminados },
    { count: livrosNoMes },
    historico,
  ] = await Promise.all([
      supabase
        .from("profiles")
        .select("display_name, username, avatar_url, avatar_zoom, avatar_bg, metrics_prefs")
        .eq("id", userId)
        .maybeSingle(),
      supabase
        .from("sessions")
        .select("started_at, ended_at, duration_seconds, unit_start, unit_end, chapter_start, chapter_end, quality_tags, item_id")
        .eq("user_id", userId)
        .eq("cadastro", false)
        .gte("started_at", `${janelaInicio}T00:00:00`),
      supabase
        .from("goals")
        .select("id, type, target_value")
        .eq("user_id", userId),
      // Livros terminados no ano corrente — mesma conta da tela de Metas.
      // Livro sem finished_at não entra (não dá pra saber o ano).
      supabase
        .from("media_items")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("status", "finished")
        .gte("finished_at", `${anoAtual}-01-01`)
        .lte("finished_at", `${anoAtual}-12-31`),
      // Livros terminados dentro do mês corrente — a pílula "Livros/mês".
      supabase
        .from("media_items")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("status", "finished")
        .gte("finished_at", `${anoAtual}-${String(agora.getMonth() + 1).padStart(2, "0")}-01`)
        .lte(
          "finished_at",
          iso(new Date(anoAtual, agora.getMonth() + 1, 0)),
        ),
      loadAchievementData(supabase, userId),
    ]);

  const todas = (sessionRows ?? []) as SessionLite[];
  // Sequência atual/recorde precisam do histórico inteiro: uma sequência que
  // atravessa o início da janela (ex.: virada do ano) seria cortada.
  const streakCompleto = computeStreak(historico.sessions);

  // Segundos lidos por dia (fuso do Brasil). Sessão que vira a noite reparte
  // o tempo entre os dois dias — é daqui que saem barras, calendário e horas.
  const segundosPorDia = new Map<string, number>();
  for (const s of todas) {
    if (!s.started_at) continue;
    for (const [dia, seg] of segundosPorDiaDaSessao(s)) {
      segundosPorDia.set(dia, (segundosPorDia.get(dia) ?? 0) + seg);
    }
  }

  // ---- Semanas navegáveis ---------------------------------------------
  const semanas: SemanaDados[] = [];
  for (let i = SEMANAS_VISIVEIS - 1; i >= 0; i -= 1) {
    const inicio = domingoDa(agora);
    inicio.setDate(inicio.getDate() - 7 * i);
    const fim = new Date(inicio);
    fim.setDate(fim.getDate() + 6);

    const dias = Array.from({ length: 7 }, (_, j) => {
      const dia = new Date(inicio);
      dia.setDate(dia.getDate() + j);
      const chave = iso(dia);
      const min = Math.round((segundosPorDia.get(chave) ?? 0) / 60);
      return { d: DIA_LABEL[dia.getDay()]!, chave, min, hoje: chave === hoje, futuro: chave > hoje };
    });

    semanas.push({ inicio: ddmm(inicio), fim: ddmm(fim), dias });
  }

  // ---- Meses navegáveis ------------------------------------------------
  const meses: MesCalendario[] = [];
  for (let i = -MESES_ANTES; i <= MESES_DEPOIS; i += 1) {
    const ref = new Date(anoAtual, agora.getMonth() + i, 1);
    const prefixo = `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, "0")}`;
    // Dia é "destaque" quando passou de 60 min lidos.
    const minutosPorDia = new Map<number, number>();
    for (const [chave, seg] of segundosPorDia) {
      if (!chave.startsWith(prefixo)) continue;
      minutosPorDia.set(Number(chave.slice(8, 10)), seg / 60);
    }

    const ehMesAtual = ref.getMonth() === agora.getMonth() && ref.getFullYear() === anoAtual;
    meses.push({
      nome: ref.toLocaleString("pt-BR", { month: "long" }),
      ano: ref.getFullYear(),
      prefixo,
      diasNoMes: new Date(ref.getFullYear(), ref.getMonth() + 1, 0).getDate(),
      primeiroDiaSemana: ref.getDay(),
      hoje: ehMesAtual ? agora.getDate() : null,
      lidos: [...minutosPorDia.keys()],
      destaques: [...minutosPorDia.entries()].filter(([, m]) => m >= 60).map(([d]) => d),
    });
  }

  // ---- Metas ------------------------------------------------------------
  // As três dimensões são exatamente as que a tela de Metas configura
  // (`books_per_year`, `hours_per_month`, `streak_days`). Ler tipo diferente
  // daqui é o que fazia os cards nascerem zerados mesmo com meta traçada.
  // Os três aparecem SEMPRE: sem alvo cadastrado, o card mostra o número atual
  // e convida a definir.
  const alvoPorTipo = new Map(
    (goals ?? []).map((g) => [g.type as string, g.target_value as number]),
  );

  // Mesmas contas da tela de Metas, pra os dois números nunca divergirem.
  const prefixoMes = `${anoAtual}-${String(agora.getMonth() + 1).padStart(2, "0")}`;
  const horasNoMes = Math.round(
    [...segundosPorDia]
      .filter(([chave]) => chave.startsWith(prefixoMes))
      .reduce((soma, [, seg]) => soma + seg, 0) / 3600,
  );
  const mesNome = agora.toLocaleString("pt-BR", { month: "long" });

  const metas: Meta[] = [
    {
      id: "sequencia",
      tipo: "sequencia",
      label: "Dias seguidos",
      atual: streakCompleto.current,
      total: alvoPorTipo.get("streak_days") ?? 0,
      unidade: "dias",
      periodo: "hoje",
    },
    {
      id: "horas",
      tipo: "horas",
      label: "Horas lidas",
      atual: horasNoMes,
      total: alvoPorTipo.get("hours_per_month") ?? 0,
      unidade: "h",
      periodo: mesNome,
    },
    {
      id: "livros",
      tipo: "livros",
      label: "Livros no ano",
      atual: livrosTerminados ?? 0,
      total: alvoPorTipo.get("books_per_year") ?? 0,
      unidade: "livros",
      periodo: String(anoAtual),
    },
  ];

  // ---- Pílulas ----------------------------------------------------------
  // Quais aparecem é escolha da pessoa em /personalizar; sem escolha, valem as
  // seis padrão. Todas as contas ficam prontas aqui — são baratas em cima das
  // sessões já carregadas, e assim trocar a seleção não exige tocar na home.
  const doAno = todas.filter((s) => s.started_at && localDateKey(s.started_at).startsWith(String(anoAtual)));
  const diasComLeituraAno = new Set(
    [...segundosPorDia.keys()].filter((chave) => chave.startsWith(String(anoAtual))),
  );

  // Média de páginas por dia efetivamente lido (não por dia do calendário).
  // Sessão que vira o ano reparte as páginas na proporção do tempo.
  const paginasAno = todas.reduce(
    (soma, s) =>
      s.started_at
        ? soma + paginasDa(s) * fracaoDaSessaoEntre(s, `${anoAtual}-01-01`, `${anoAtual}-12-31`)
        : soma,
    0,
  );
  const mediaPaginas =
    diasComLeituraAno.size > 0 ? Math.round(paginasAno / diasComLeituraAno.size) : 0;

  // Tempo lido na semana corrente (a última do array de semanas).
  const minutosSemana = semanas[semanas.length - 1]!.dias.reduce((soma, d) => soma + d.min, 0);

  // Horário de ouro e dia da semana preferido: a hora/dia em que mais sessões
  // começaram — mesma lógica, duas contagens no mesmo laço.
  const porHora = new Map<number, number>();
  const porDiaSemana = new Map<string, number>();
  for (const s of doAno) {
    const h = localHour(s.started_at);
    porHora.set(h, (porHora.get(h) ?? 0) + 1);
    const dia = localWeekday(s.started_at);
    porDiaSemana.set(dia, (porDiaSemana.get(dia) ?? 0) + 1);
  }
  let melhorHora: string | null = null;
  let maiorContagem = 0;
  for (const [h, n] of porHora) {
    if (n > maiorContagem) {
      maiorContagem = n;
      melhorHora = `${h}h`;
    }
  }
  let diaPreferido: string | null = null;
  let maiorContagemDia = 0;
  for (const [dia, n] of porDiaSemana) {
    if (n > maiorContagemDia) {
      maiorContagemDia = n;
      diaPreferido = dia;
    }
  }

  const mesCurto = agora.toLocaleString("pt-BR", { month: "short" }).replace(".", "");

  const stats: PillStats = {
    streak: streakCompleto.current,
    pagesPerDay: mediaPaginas,
    preferredWeekday: diaPreferido,
    minutesThisWeek: minutosSemana,
    booksThisMonth: livrosNoMes ?? 0,
    mesCurto,
    bestTime: melhorHora,
    booksPerYear: livrosTerminados ?? 0,
    hoursPerMonth: horasNoMes,
    chaptersPerWeek: computeChaptersPerWeek(todas),
    maxSessionPages: historico.ctx.maxSessionPages,
    longestStreakEver: streakCompleto.record,
  };
  const pilulas = pillsEscolhidas(profile?.metrics_prefs).map((chave) =>
    pillDisplay(chave, stats),
  );

  return {
    nomeUsuario: nomeExibicao(profile?.display_name as string | null, profile?.username as string | null),
    avatarUrl: (profile?.avatar_url as string | null) ?? null,
    avatarZoom: (profile?.avatar_zoom as number | null) ?? 100,
    avatarBg: (profile?.avatar_bg as string | null) ?? AVATAR_FUNDO_PADRAO,
    semanas,
    meses,
    metas,
    pilulas,
    historico,
  };
}

/** A coleção do ano — zera em janeiro. */
async function carregarConquistas(
  supabase: Supabase,
  userId: string,
  historico: Awaited<ReturnType<typeof carregarBase>>["historico"],
) {
  const ano = anoDasConquistas();
  const ctxDoAno = historico.doAno(ano);
  const conquistasFeitas = evaluateAchievements(ctxDoAno)
    .filter((e) => e.met)
    .map((e) => e.achievement.key);
  return montarConquistas(
    ctxDoAno,
    await datasDeDesbloqueio(supabase, userId, conquistasFeitas, ano),
    historico.ctx,
  );
}

export default async function HomePage() {
  const userId = await requireUserId();
  const supabase = await createClient();

  // Tudo sai ao mesmo tempo: desafios e notificações não dependem da base, e
  // as conquistas só esperam o histórico. Antes eram três rodadas seguidas.
  const base = carregarBase(supabase, userId);
  const desafios = getActiveChallenges(supabase, userId);
  const notificacoes = getNotificacoes(supabase, userId).then((n) => n.novas);
  const conquistas = base.then((b) => carregarConquistas(supabase, userId, b.historico));
  // Se a base falhar a página quebra antes de alguém esperar estas — sem o
  // catch, a falha delas vira "unhandled rejection" no log.
  for (const p of [desafios, notificacoes, conquistas]) p.catch(() => {});

  const b = await base;

  return (
    <div className="flex flex-col gap-5 px-5 pb-8 pt-6">
      <HomeTopo
        nomeUsuario={b.nomeUsuario}
        avatarUrl={b.avatarUrl}
        avatarZoom={b.avatarZoom}
        avatarBg={b.avatarBg}
        metas={b.metas}
        notificacoes={notificacoes}
      />
      {/* O resto espera desafios e conquistas; até lá, esqueleto no lugar. */}
      <Suspense fallback={<EsqueletoHomeResto />}>
        <Resto base={b} desafios={desafios} conquistas={conquistas} />
      </Suspense>
    </div>
  );
}

async function Resto({
  base,
  desafios,
  conquistas,
}: {
  base: Awaited<ReturnType<typeof carregarBase>>;
  desafios: ReturnType<typeof getActiveChallenges>;
  conquistas: ReturnType<typeof carregarConquistas>;
}) {
  const [desafiosAtivos, conquistasView] = await Promise.all([desafios, conquistas]);
  return (
    <HomeResto
      semanas={base.semanas}
      meses={base.meses}
      pilulas={base.pilulas}
      conquistas={conquistasView}
      desafios={desafiosAtivos.map((d, i) => ({
        id: d.id,
        nome: d.name,
        tone: (["coral", "moss", "mustard"] as const)[i % 3]!,
      }))}
    />
  );
}
