import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/supabase/auth";
import { getActiveChallenges } from "@/lib/challenges";
import {
  computeStreak,
  computeChaptersPerWeek,
  computeMaxSessionPages,
  type SessionRow,
} from "@/lib/gamification";
import { pillsEscolhidas, pillDisplay, type PillStats } from "@/lib/pills";
import { nomeExibicao } from "@/lib/nome-exibicao";
import { AVATAR_FUNDO_PADRAO } from "@/lib/avatares";
import HomeClient, { type Meta, type SemanaDados, type MesCalendario } from "./home-client";

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
// `computeChaptersPerWeek` e `computeMaxSessionPages` esperam.
type SessionLite = SessionRow;

export default async function HomePage() {
  const userId = await requireUserId();
  const supabase = await createClient();

  const agora = new Date();
  const hoje = iso(agora);
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
  ] = await Promise.all([
      supabase
        .from("profiles")
        .select("display_name, username, avatar_url, avatar_zoom, avatar_bg, metrics_prefs")
        .eq("id", userId)
        .maybeSingle(),
      supabase
        .from("sessions")
        .select("started_at, duration_seconds, unit_start, unit_end, chapter_start, chapter_end, quality_tags, item_id")
        .eq("user_id", userId)
        .gte("started_at", `${janelaInicio}T00:00:00`),
      supabase
        .from("goals")
        .select("id, type, target_value")
        .eq("user_id", userId),
      supabase
        .from("media_items")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("status", "finished"),
]);

  const todas = (sessionRows ?? []) as SessionLite[];

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
      const min = Math.round(
        todas
          .filter((s) => s.started_at?.slice(0, 10) === chave)
          .reduce((soma, s) => soma + (s.duration_seconds ?? 0), 0) / 60,
      );
      return { d: DIA_LABEL[dia.getDay()]!, min, hoje: chave === hoje };
    });

    semanas.push({ inicio: ddmm(inicio), fim: ddmm(fim), dias });
  }

  // ---- Meses navegáveis ------------------------------------------------
  const meses: MesCalendario[] = [];
  for (let i = -MESES_ANTES; i <= MESES_DEPOIS; i += 1) {
    const ref = new Date(anoAtual, agora.getMonth() + i, 1);
    const prefixo = `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, "0")}`;
    const doMes = todas.filter((s) => s.started_at?.startsWith(prefixo));

    // Dia é "destaque" quando passou de 60 min lidos.
    const minutosPorDia = new Map<number, number>();
    for (const s of doMes) {
      const dia = Number(s.started_at.slice(8, 10));
      minutosPorDia.set(dia, (minutosPorDia.get(dia) ?? 0) + (s.duration_seconds ?? 0) / 60);
    }

    const ehMesAtual = ref.getMonth() === agora.getMonth() && ref.getFullYear() === anoAtual;
    meses.push({
      nome: ref.toLocaleString("pt-BR", { month: "long" }),
      ano: ref.getFullYear(),
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
    todas
      .filter((s) => s.started_at?.startsWith(prefixoMes))
      .reduce((soma, s) => soma + (s.duration_seconds ?? 0), 0) / 3600,
  );
  const mesNome = agora.toLocaleString("pt-BR", { month: "long" });

  const metas: Meta[] = [
    {
      id: "sequencia",
      tipo: "sequencia",
      label: "Dias seguidos",
      atual: computeStreak(todas).current,
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
  // O que aparece aqui é escolha da pessoa em /personalizar. Antes a home
  // cravava seis pílulas no código e ignorava `metrics_prefs` — daí a opção
  // existir no perfil e não mudar nada na tela.
  const streakCompleto = computeStreak(todas);
  const stats: PillStats = {
    booksPerYear: livrosTerminados ?? 0,
    hoursPerMonth: horasNoMes,
    streakDays: streakCompleto.current,
    chaptersPerWeek: computeChaptersPerWeek(todas),
    maxSessionPages: computeMaxSessionPages(todas),
    longestStreakEver: streakCompleto.record,
  };
  const pilulas = pillsEscolhidas(profile?.metrics_prefs).map((chave) =>
    pillDisplay(chave, stats),
  );

  const desafiosAtivos = await getActiveChallenges(supabase, userId);

  return (
    <HomeClient
      nomeUsuario={nomeExibicao(profile?.display_name as string | null, profile?.username as string | null)}
      avatarUrl={(profile?.avatar_url as string | null) ?? null}
      avatarZoom={(profile?.avatar_zoom as number | null) ?? 100}
      avatarBg={(profile?.avatar_bg as string | null) ?? AVATAR_FUNDO_PADRAO}
      semanas={semanas}
      meses={meses}
      metas={metas}
      desafios={desafiosAtivos.map((d, i) => ({
        id: d.id,
        nome: d.name,
        emoji: d.emoji ?? "📚",
        tone: (["coral", "moss", "mustard"] as const)[i % 3]!,
      }))}
      pilulas={pilulas}
    />
  );
}
