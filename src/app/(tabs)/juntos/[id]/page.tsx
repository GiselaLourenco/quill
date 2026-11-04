import Link from "next/link";
import { getFriends } from "@/lib/friends";
import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/supabase/auth";
import { computeScores, daysRemaining, periodProgress, type ScoringMetric, SCORING_METRIC_OPTIONS, SCORING_METRIC_UNIT } from "@/lib/challenges";
import DesafioDetalheClient from "./detalhe-client";
import { nomeExibicao } from "@/lib/nome-exibicao";
import { AVATAR_FUNDO_PADRAO } from "@/lib/avatares";
import { localDateKey, localTime, todayLocalDateKey, addDaysToKey } from "@/lib/date-br";

export default async function DesafioDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const userId = await requireUserId();
  const supabase = await createClient();

  // Dados do grupo
  const { data: group } = await supabase
    .from("groups")
    .select("id, name, scoring_metric, starts_at, ends_at, invite_code")
    .eq("id", id)
    .single();

  if (!group) {
    return (
      <div className="min-h-full bg-paper px-4 pt-10 text-center">
        <p className="font-serif italic text-ink">Desafio não encontrado.</p>
        <Link href="/juntos" className="mt-4 inline-block border-2 border-ink bg-ink px-4 py-2 font-display text-xs uppercase tracking-widest text-paper">
          Voltar
        </Link>
      </div>
    );
  }

  const metric = (group.scoring_metric as ScoringMetric) ?? "active_days";
  const unit = SCORING_METRIC_UNIT[metric];
  const diasRestantes = daysRemaining(group.ends_at as string | null) ?? 0;
  const progresso = periodProgress(group.starts_at as string | null, group.ends_at as string | null);
  // Desafio encerrado continua visível (histórico, ranking, feed), mas fechado
  // para novos check-ins.
  const fim = group.ends_at as string | null;
  const encerrado = Boolean(fim && fim < todayLocalDateKey());
  // Desafio marcado para começar depois: dá pra ver e convidar, mas check-in
  // antes da largada bagunçaria placar e sequência.
  const naoComecou = Boolean(
    group.starts_at && (group.starts_at as string) > todayLocalDateKey(),
  );

  // Check-ins + membros
  const { data: checkins } = await supabase
    .from("challenge_checkins")
    .select("id, user_id, note, created_at, session:sessions(id, started_at, ended_at, duration_seconds, unit_start, unit_end, chapter_start, chapter_end, quality_tags, item:media_items(id, title, creator, cover_kind, cover_url, cover_palette))")
    .eq("group_id", id)
    .order("created_at", { ascending: false });

  const memberIds = Array.from(new Set((checkins ?? []).map((c) => c.user_id as string)));

  // Comentários nos check-ins (o "comentar"). Reações (🔥👏☕😮) também moram
  // em comments com scope 'checkin' — ficam de fora.
  const REACOES = new Set(["🔥", "👏", "☕", "😮"]);
  const checkinIds = (checkins ?? []).map((c) => c.id as string);
  const { data: comentariosRows } = checkinIds.length
    ? await supabase
        .from("comments")
        .select("id, checkin_id, user_id, content, gif_url, created_at")
        .eq("scope", "checkin")
        .in("checkin_id", checkinIds)
        .order("created_at", { ascending: true })
    : { data: [] };
  const comentariosValidos = (comentariosRows ?? []).filter(
    (k) => k.gif_url || (k.content && !REACOES.has(k.content as string)),
  );
  const perfisIds = Array.from(
    new Set([...memberIds, ...comentariosValidos.map((k) => k.user_id as string)]),
  );

  // Quem já está no desafio sai da lista de convidáveis — e é `group_members`
  // que manda, não quem fez check-in: entrou e ainda não leu continua dentro.
  const [amigos, { data: jaMembros }] = await Promise.all([
    getFriends(supabase, userId),
    supabase.from("group_members").select("user_id").eq("group_id", id),
  ]);
  const idsNoDesafio = new Set((jaMembros ?? []).map((m) => m.user_id as string));

  const { data: profiles } = perfisIds.length
    ? await supabase
        .from("profiles")
        .select("id, display_name, username, avatar_url, avatar_zoom, avatar_bg")
        .in("id", perfisIds)
    : { data: [] };

  // Ranking e feed mostram o nome de exibição de todo mundo, inclusive o seu —
  // quem é "você" já aparece pelo selo, então trocar o nome por "Você" só
  // fazia os próprios check-ins ficarem sem identidade.
  const perfilPorId = new Map(
    (profiles ?? []).map((p) => [
      p.id as string,
      {
        nome: nomeExibicao(p.display_name as string | null, p.username as string | null),
        avatarUrl: (p.avatar_url as string | null) ?? null,
        avatarZoom: (p.avatar_zoom as number | null) ?? 100,
        avatarBg: (p.avatar_bg as string | null) ?? AVATAR_FUNDO_PADRAO,
      },
    ]),
  );

  const perfilDe = (uid: string) =>
    perfilPorId.get(uid) ?? { nome: "membro", avatarUrl: null, avatarZoom: 100, avatarBg: AVATAR_FUNDO_PADRAO };

  // Ranking
  const scores = computeScores(
    (checkins ?? []).map((c) => ({
      user_id: c.user_id as string,
      session: (c.session as unknown) as {
        started_at: string;
        duration_seconds: number | null;
        unit_start: number | null;
        unit_end: number | null;
        chapter_start: number | null;
        chapter_end: number | null;
      } | null,
    })),
    metric,
  );

  const ranking = Array.from(scores.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([ uid, score], i) => {
      const perfil = perfilDe(uid);
      return {
        posicao: i + 1,
        userId: uid,
        nome: perfil.nome,
        avatarUrl: perfil.avatarUrl,
        avatarZoom: perfil.avatarZoom,
        avatarBg: perfil.avatarBg,
        metrica: `${score} ${unit}`,
        ehVoce: uid === userId,
      };
    });

  const minhaPosicao = ranking.find((r) => r.ehVoce)?.posicao ?? 0;

  // Uma cor por membro — a mesma nos pontos do calendário do grupo e no
  // quadradinho do feed. Ordem do ranking, pra cor não pular entre visitas.
  const CORES_MEMBRO = ["#1d9e75", "#d85a30", "#26215c", "#ef9f27", "#e28d6a", "#69b997", "#6e6887", "#f1ba65", "#0f6e56", "#8a7f6b"];
  const corPorMembro = new Map(
    [...ranking.map((r) => r.userId), ...memberIds].map((uid, i, todos) => [uid, todos.indexOf(uid)]),
  );
  const corDe = (uid: string) => CORES_MEMBRO[(corPorMembro.get(uid) ?? 0) % CORES_MEMBRO.length];
  const membros = Array.from(new Set([...ranking.map((r) => r.userId), ...memberIds])).map((uid) => ({
    userId: uid,
    nome: perfilDe(uid).nome,
    cor: corDe(uid),
    ehVoce: uid === userId,
  }));

  // Check-ins da semana atual (do usuário) — dia calculado no fuso do
  // Brasil: uma sessão feita à noite local não pode cair no dia seguinte só
  // porque em UTC o relógio já virou.
  const hojeKey = todayLocalDateKey();
  const diaSemana = new Date(`${hojeKey}T12:00:00Z`).getUTCDay(); // 0=Dom
  const inicioSemanaKey = addDaysToKey(hojeKey, -diaSemana);

  const diasSemana = Array.from({ length: 7 }, (_, i) => addDaysToKey(inicioSemanaKey, i));

  const checkinsDoUsuario = new Set(
    (checkins ?? [])
      .filter((c) => c.user_id === userId)
      .map((c) => {
        const s = (c.session as unknown) as { started_at: string } | null;
        return s?.started_at ? localDateKey(s.started_at) : "";
      })
      .filter(Boolean),
  );

  const DIAS_LABEL = ["D", "S", "T", "Q", "Q", "S", "S"];
  const semana = diasSemana.map((isoDate, i) => {
    const isHoje = isoDate === hojeKey;
    const feito = checkinsDoUsuario.has(isoDate);
    return {
      chave: isoDate,
      data: new Date(isoDate + "T12:00:00").getDate(),
      label: DIAS_LABEL[i],
      estado: (isHoje && feito ? "hoje-feito" : isHoje ? "hoje" : feito ? "feito" : "vazio") as
        "vazio" | "feito" | "hoje" | "hoje-feito",
    };
  });

  // Todos os check-ins, já no formato do cartão: feed (os 20 primeiros) e
  // painel do dia usam os mesmos.
  const comentariosPorCheckin = new Map<string, typeof comentariosValidos>();
  for (const k of comentariosValidos) {
    const id = k.checkin_id as string;
    comentariosPorCheckin.set(id, [...(comentariosPorCheckin.get(id) ?? []), k]);
  }
  const detalhes = (checkins ?? []).map((c) => {
    const s = (c.session as unknown) as {
      id: string;
      started_at: string;
      ended_at: string | null;
      duration_seconds: number | null;
      unit_start: number | null;
      unit_end: number | null;
      chapter_start: number | null;
      chapter_end: number | null;
      quality_tags: string[] | null;
      // null quando o livro é de alguém que não é seu amigo (RLS)
      item: { id: string; title: string; creator: string | null; cover_kind: string; cover_url: string | null; cover_palette: number } | null;
    } | null;

    let texto = "fez check-in";
    const pages = s?.unit_start != null && s?.unit_end != null ? Math.max(0, s.unit_end - s.unit_start) : 0;
    const caps = s?.chapter_start != null && s?.chapter_end != null ? Math.max(0, s.chapter_end - s.chapter_start) : 0;
    const min = s?.duration_seconds ? Math.round(s.duration_seconds / 60) : 0;
    if (metric === "minutes" && min > 0) texto = `leu ${min} min`;
    else if (pages > 0) texto = `leu ${pages} pgs`;
    else if (caps > 0) texto = `leu ${caps} cap.`;
    else if (min > 0) texto = `leu ${min} min`;

    const detalhe = [metric !== "minutes" && min > 0 ? `${min} min` : null, s?.item?.title ?? null]
      .filter(Boolean)
      .join(" · ");
    const uid = c.user_id as string;

    return {
      id: c.id as string,
      userId: uid,
      nome: perfilDe(uid).nome,
      cor: corDe(uid),
      dia: localDateKey(s?.started_at ?? (c.created_at as string)),
      texto,
      detalhe: detalhe || null,
      nota: (c.note as string | null) ?? null,
      quando: formatQuando(c.created_at as string),
      sessao: s
        ? {
            id: s.id,
            inicio: localTime(s.started_at),
            fim: s.ended_at ? localTime(s.ended_at) : null,
            minutos: min,
            paginaInicio: s.unit_start,
            paginaFim: s.unit_end,
            capituloInicio: s.chapter_start,
            capituloFim: s.chapter_end,
            tags: s.quality_tags ?? [],
            livro: s.item,
          }
        : null,
      comentarios: (comentariosPorCheckin.get(c.id as string) ?? []).map((k) => ({
        id: k.id as string,
        nome: perfilDe(k.user_id as string).nome,
        cor: memberIds.includes(k.user_id as string) ? corDe(k.user_id as string) : "#6b6152",
        texto: (k.content as string | null) ?? null,
        gifUrl: (k.gif_url as string | null) ?? null,
        quando: formatQuando(k.created_at as string).toLowerCase(),
      })),
    };
  });

  const codigoConvite = (group.invite_code as string | null) ?? group.id.slice(0, 8).toUpperCase();

  // Livros "lendo" para o select do check-in
  const { data: livrosRows } = await supabase
    .from("media_items")
    .select("id, title")
    .eq("user_id", userId)
    .eq("status", "reading")
    .order("created_at", { ascending: false });

  const livrosLendo = (livrosRows ?? []).map((l) => ({
    id: l.id as string,
    titulo: (l.title as string) ?? "Sem título",
  }));

  return (
    <DesafioDetalheClient
      amigosConvidaveis={amigos.map((a) => ({
        id: a.id,
        nome: a.name,
        avatarUrl: perfilPorId.get(a.id)?.avatarUrl ?? null,
        avatarBg: perfilPorId.get(a.id)?.avatarBg ?? AVATAR_FUNDO_PADRAO,
        jaEstaNoDesafio: idsNoDesafio.has(a.id),
      }))}
      group={{
        id: group.id as string,
        nome: group.name as string,
        metric,
        unit,
        diasRestantes: Math.max(0, diasRestantes),
        encerrado,
        naoComecou,
        comecaEm: (group.starts_at as string | null) ?? null,
        progresso,
        minhaPosicao,
        codigoConvite,
        metricaLabel: SCORING_METRIC_OPTIONS.find((o) => o.value === metric)?.label ?? metric,
        duracaoDias:
          group.starts_at && group.ends_at
            ? Math.round(
                (Date.parse(`${group.ends_at}T12:00:00Z`) - Date.parse(`${group.starts_at}T12:00:00Z`)) /
                  86_400_000,
              ) + 1
            : null,
      }}
      membros={membros}
      semana={semana}
      ranking={ranking}
      checkins={detalhes}
      livros={livrosLendo}
    />
  );
}

function formatQuando(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return "Agora";
  if (h < 24) return `Há ${h}h`;
  const d = Math.floor(h / 24);
  if (d === 1) return "Ontem";
  return `${d} dias atrás`;
}
