import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/supabase/auth";
import { computeScores, daysRemaining, periodProgress, type ScoringMetric, SCORING_METRIC_UNIT } from "@/lib/challenges";
import DesafioDetalheClient from "./detalhe-client";
import { nomeExibicao } from "@/lib/nome-exibicao";

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
    .select("id, name, emoji, scoring_metric, starts_at, ends_at, invite_code")
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
  const encerrado = Boolean(fim && fim < new Date().toISOString().slice(0, 10));

  // Check-ins + membros
  const { data: checkins } = await supabase
    .from("challenge_checkins")
    .select("user_id, note, created_at, session:sessions(started_at, duration_seconds, unit_start, unit_end, chapter_start, chapter_end)")
    .eq("group_id", id)
    .order("created_at", { ascending: false });

  const memberIds = Array.from(new Set((checkins ?? []).map((c) => c.user_id as string)));

  const { data: profiles } = memberIds.length
    ? await supabase.from("profiles").select("id, display_name, username").in("id", memberIds)
    : { data: [] };

  const nameById = new Map(
    (profiles ?? []).map((p) => [
      p.id as string,
      nomeExibicao(p.display_name as string | null, p.username as string | null),
    ]),
  );
  nameById.set(userId, "Você");

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
    .map(([ uid, score], i) => ({
      posicao: i + 1,
      userId: uid,
      nome: nameById.get(uid) ?? "membro",
      metrica: `${score} ${unit}`,
      ehVoce: uid === userId,
    }));

  const minhaPosicao = ranking.find((r) => r.ehVoce)?.posicao ?? 0;

  // Check-ins da semana atual (do usuário)
  const hoje = new Date();
  const diaSemana = hoje.getDay(); // 0=Dom
  const inicioSemana = new Date(hoje);
  inicioSemana.setDate(hoje.getDate() - diaSemana);

  const diasSemana = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(inicioSemana);
    d.setDate(inicioSemana.getDate() + i);
    return d.toISOString().slice(0, 10);
  });

  const checkinsDoUsuario = new Set(
    (checkins ?? [])
      .filter((c) => c.user_id === userId)
      .map((c) => {
        const s = (c.session as unknown) as { started_at: string } | null;
        return s?.started_at?.slice(0, 10) ?? "";
      })
      .filter(Boolean),
  );

  const DIAS_LABEL = ["D", "S", "T", "Q", "Q", "S", "S"];
  const semana = diasSemana.map((isoDate, i) => {
    const isHoje = isoDate === hoje.toISOString().slice(0, 10);
    const feito = checkinsDoUsuario.has(isoDate);
    return {
      data: new Date(isoDate + "T12:00:00").getDate(),
      label: DIAS_LABEL[i],
      estado: (isHoje && feito ? "hoje-feito" : isHoje ? "hoje" : feito ? "feito" : "vazio") as
        "vazio" | "feito" | "hoje" | "hoje-feito",
    };
  });

  // Feed de atividade recente (últimos 20 check-ins de todos)
  const atividade = (checkins ?? []).slice(0, 20).map((c, idx) => {
    const s = (c.session as unknown) as {
      started_at: string;
      duration_seconds: number | null;
      unit_start: number | null;
      unit_end: number | null;
    } | null;

    let texto = "fez check-in";
    if (metric === "pages" && s?.unit_start != null && s?.unit_end != null) {
      const pages = Math.max(0, (s.unit_end ?? 0) - (s.unit_start ?? 0));
      if (pages > 0) texto = `leu ${pages} pgs`;
    } else if (metric === "minutes" && s?.duration_seconds) {
      const min = Math.round(s.duration_seconds / 60);
      texto = `leu ${min} min`;
    }

    const quando = formatQuando(c.created_at as string);
    const uid = c.user_id as string;

    return {
      id: `${uid}-${idx}`,
      userId: uid,
      nome: nameById.get(uid) ?? "membro",
      texto,
      nota: (c.note as string | null) ?? null,
      quando,
      ehVoce: uid === userId,
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
      group={{
        id: group.id as string,
        nome: group.name as string,
        emoji: (group.emoji as string | null) ?? "📚",
        metric,
        unit,
        diasRestantes: Math.max(0, diasRestantes),
        encerrado,
        progresso,
        minhaPosicao,
        codigoConvite,
      }}
      semana={semana}
      ranking={ranking}
      atividade={atividade}
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
