import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/supabase/auth";
import { getActiveChallenges } from "@/lib/challenges";
import HomeClient from "./home-client";

export default async function HomePage() {
  const userId = await requireUserId();
  const supabase = await createClient();

  const hoje = new Date().toISOString().slice(0, 10);
  const anoAtual = new Date().getFullYear();
  const inicioAno = `${anoAtual}-01-01`;

  // Dados do perfil
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", userId)
    .maybeSingle();

  // Sessões deste ano (para stats globais)
  const { data: sessionsAno } = await supabase
    .from("sessions")
    .select("started_at, duration_seconds, unit_start, unit_end")
    .eq("user_id", userId)
    .gte("started_at", inicioAno);

  const allSessions = sessionsAno ?? [];

  // Stats de hoje
  const sessionsHoje = allSessions.filter((s) => s.started_at?.slice(0, 10) === hoje);
  const minutosHoje = Math.round(sessionsHoje.reduce((sum, s) => sum + ((s.duration_seconds as number) ?? 0), 0) / 60);
  const paginasHoje = sessionsHoje.reduce((max, s) => {
    const pages = Math.max(0, ((s.unit_end as number) ?? 0) - ((s.unit_start as number) ?? 0));
    return max + pages;
  }, 0);

  // Sessões da semana (últimos 7 dias) agrupadas por dia
  const semanaData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const iso = d.toISOString().slice(0, 10);
    const labels = ["D", "S", "T", "Q", "Q", "S", "S"];
    const label = labels[d.getDay()];
    const min = Math.round(
      allSessions
        .filter((s) => s.started_at?.slice(0, 10) === iso)
        .reduce((sum, s) => sum + ((s.duration_seconds as number) ?? 0), 0) / 60,
    );
    return { d: label, min, hoje: iso === hoje };
  });

  // Calendário do mês atual
  const mesAtual = new Date();
  const diasComLeitura = new Set(
    allSessions
      .filter((s) => s.started_at?.startsWith(`${anoAtual}-${String(mesAtual.getMonth() + 1).padStart(2, "0")}`))
      .map((s) => new Date(s.started_at as string).getDate()),
  );

  // Metas ativas
  const { data: goals } = await supabase
    .from("goals")
    .select("id, type, target_value, period_start, period_end")
    .eq("user_id", userId);

  // Livros terminados no ano (para meta books_per_year)
  const { count: livrosTerminados } = await supabase
    .from("media_items")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "finished");

  const metas = (goals ?? []).map((g) => {
    let atual = 0;
    let label = "";
    let unidade = "";
    let periodo = "";

    if (g.type === "minutes_per_day") {
      atual = minutosHoje;
      label = "Minutos hoje";
      unidade = "min";
      periodo = "hoje";
    } else if (g.type === "pages_per_day") {
      atual = paginasHoje;
      label = "Páginas hoje";
      unidade = "pág";
      periodo = "hoje";
    } else if (g.type === "books_per_year") {
      atual = livrosTerminados ?? 0;
      label = "Livros no ano";
      unidade = "livros";
      periodo = String(anoAtual);
    } else {
      return null;
    }

    return {
      id: g.id as string,
      tipo: g.type === "minutes_per_day" ? "minutos" : g.type === "pages_per_day" ? "paginas" : "livros" as "minutos" | "paginas" | "livros",
      label,
      atual,
      total: g.target_value as number,
      unidade,
      periodo,
    };
  }).filter(Boolean) as { id: string; tipo: "minutos" | "paginas" | "livros"; label: string; atual: number; total: number; unidade: string; periodo: string }[];

  // Desafios ativos
  const desafiosAtivos = await getActiveChallenges(supabase, userId);

  // Sequência (streak)
  const diasOrdenados = Array.from(new Set(allSessions.map((s) => s.started_at?.slice(0, 10) ?? ""))).filter(Boolean).sort().reverse();
  let streak = 0;
  const todayStr = hoje;
  for (let i = 0; i < diasOrdenados.length; i++) {
    const esperado = new Date(todayStr);
    esperado.setDate(esperado.getDate() - i);
    if (diasOrdenados[i] === esperado.toISOString().slice(0, 10)) streak++;
    else break;
  }

  // Total de horas no ano
  const totalSegundos = allSessions.reduce((sum, s) => sum + ((s.duration_seconds as number) ?? 0), 0);
  const totalMinutos = Math.round(totalSegundos / 60);
  const horasStr = totalMinutos >= 60 ? `${Math.floor(totalMinutos / 60)}h${totalMinutos % 60 > 0 ? `${totalMinutos % 60}` : ""}` : `${totalMinutos}min`;

  // Média páginas/dia (últimos 30 dias com leitura)
  const mediaPaginas = diasComLeitura.size > 0
    ? Math.round(allSessions.filter((s) => s.started_at?.startsWith(`${anoAtual}-${String(mesAtual.getMonth() + 1).padStart(2, "0")}`)).reduce((sum, s) => sum + Math.max(0, ((s.unit_end as number) ?? 0) - ((s.unit_start as number) ?? 0)), 0) / Math.max(1, diasComLeitura.size))
    : 0;

  return (
    <HomeClient
      nomeUsuario={(profile?.display_name as string | null) ?? "Leitor"}
      semana={semanaData}
      mesInfo={{
        nome: mesAtual.toLocaleString("pt-BR", { month: "long" }),
        ano: anoAtual,
        diasNoMes: new Date(anoAtual, mesAtual.getMonth() + 1, 0).getDate(),
        primeiroDiaSemana: new Date(anoAtual, mesAtual.getMonth(), 1).getDay(),
        hoje: mesAtual.getDate(),
      }}
      diasComLeitura={Array.from(diasComLeitura)}
      metas={metas}
      desafios={desafiosAtivos.map((d, i) => ({
        id: d.id,
        nome: d.name,
        emoji: d.emoji ?? "📚",
        tone: (["coral", "moss", "mustard"] as const)[i % 3],
      }))}
      pilulas={[
        { id: "sequencia", label: "Sequência", valor: String(streak), unidade: "dias", tone: "moss" as const },
        { id: "media-pag", label: "Média/dia", valor: String(mediaPaginas), unidade: "pág", tone: "paper" as const },
        { id: "livros-ano", label: "Livros/ano", valor: String(livrosTerminados ?? 0), unidade: `em ${anoAtual}`, tone: "mustard" as const },
        { id: "horas-ano", label: "Horas lidas", valor: horasStr, unidade: `em ${anoAtual}`, tone: "navy" as const },
      ]}
    />
  );
}
