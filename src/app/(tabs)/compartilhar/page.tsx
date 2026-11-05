import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/supabase/auth";
import CompartilharClient, { type PeriodoStats, type LivroCartaz } from "./compartilhar-client";
import { addDaysToKey, fimDoMes, fracaoDaSessaoEntre, localDateKey, localHour, segundosPorDiaDaSessao, todayLocalDateKey } from "@/lib/date-br";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const MESES_A_MOSTRAR = 6;

function pad(n: number) {
  return String(n).padStart(2, "0");
}

type SessionRow = {
  started_at: string;
  duration_seconds: number | null;
  unit_start: number | null;
  unit_end: number | null;
  item_id: string | null;
};

type LivroRow = {
  id: string;
  title: string | null;
  creator: string | null;
  status: string;
};

/** Últimos N meses (mais antigo primeiro), como chaves "AAAA-MM". */
function ultimosMeses(qtd: number): { id: string; ano: number; mes: number }[] {
  const hojeKey = todayLocalDateKey();
  const anoAtual = Number(hojeKey.slice(0, 4));
  const mesAtual = Number(hojeKey.slice(5, 7)) - 1; // 0-based
  const out: { id: string; ano: number; mes: number }[] = [];
  for (let i = qtd - 1; i >= 0; i -= 1) {
    const d = new Date(anoAtual, mesAtual - i, 1);
    out.push({ id: `${d.getFullYear()}-${pad(d.getMonth() + 1)}`, ano: d.getFullYear(), mes: d.getMonth() });
  }
  return out;
}

/** Maior sequência de dias seguidos dentro do conjunto (só os dias dados). */
function maiorSequencia(dias: Set<string>): number {
  let maior = 0;
  for (const dia of dias) {
    if (dias.has(addDaysToKey(dia, -1))) continue;
    let n = 1;
    while (dias.has(addDaysToKey(dia, n))) n += 1;
    maior = Math.max(maior, n);
  }
  return maior;
}

/** Hora em que a pessoa mais começa a ler — o "horário de ouro". */
function horaDeOuro(sessions: SessionRow[]): string {
  if (sessions.length === 0) return "—";
  const contagem = new Map<number, number>();
  for (const s of sessions) {
    const hora = localHour(s.started_at);
    contagem.set(hora, (contagem.get(hora) ?? 0) + 1);
  }
  let melhor = 0;
  let maior = -1;
  for (const [hora, n] of contagem) {
    if (n > maior) {
      maior = n;
      melhor = hora;
    }
  }
  return `${melhor}h`;
}

export default async function CompartilharPage() {
  const userId = await requireUserId();

  const meses = ultimosMeses(MESES_A_MOSTRAR);
  const inicio = `${meses[0]!.id}-01`;

  const supabase = await createClient();
  const [{ data: sessions }, { data: livrosRows }, { data: ratings }, { data: metaAno }, { data: terminos }] = await Promise.all([
    supabase
      .from("sessions")
      .select("started_at, ended_at, duration_seconds, unit_start, unit_end, item_id")
      .eq("user_id", userId)
      .eq("cadastro", false)
      .gte("started_at", `${inicio}T00:00:00`),
    // Estante inteira — alimenta tanto o "livro do período" quanto a busca.
    supabase
      .from("media_items")
      .select("id, title, creator, status")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase.from("ratings").select("item_id, stars").eq("user_id", userId),
    supabase
      .from("goals")
      .select("target_value")
      .eq("user_id", userId)
      .eq("type", "books_per_year")
      .limit(1)
      .maybeSingle(),
    // Toda leitura terminada conta — a releitura também, no mês em que
    // terminou. Mesma fonte de Metas e Retrospectiva.
    supabase
      .from("finished_readings")
      .select("item_id, finished_at")
      .eq("user_id", userId)
      .not("finished_at", "is", null),
  ]);

  const rows = (sessions ?? []) as SessionRow[];
  const livrosTodos = (livrosRows ?? []) as LivroRow[];
  const estrelasPorItem = new Map((ratings ?? []).map((r) => [r.item_id, r.stars]));

  const paraCartaz = (l: LivroRow): LivroCartaz => ({
    id: l.id,
    titulo: l.title ?? "Sem título",
    autor: l.creator ?? "",
    nota: estrelasPorItem.get(l.id) ?? null,
  });

  const livroPorId = new Map(livrosTodos.map((l) => [l.id, l]));
  const livrosFinalizados = livrosTodos.filter((l) => l.status === "finished").map(paraCartaz);
  const todosLivros = livrosTodos.map(paraCartaz);
  const alvoAno = Number(metaAno?.target_value ?? 0);
  const terminadosComData = (terminos ?? []) as { item_id: string; finished_at: string }[];

  const periodos: PeriodoStats[] = meses.map(({ id, ano, mes }) => {
    const doMes = rows.filter((s) => localDateKey(s.started_at).slice(0, 7) === id);
    // Tempo e dias lidos seguem o relógio (sessão que vira a noite conta nos
    // dois dias); páginas são repartidas na mesma proporção.
    let segundos = 0;
    const dias = new Set<string>();
    for (const s of rows) {
      for (const [dia, seg] of segundosPorDiaDaSessao(s)) {
        if (dia.slice(0, 7) !== id) continue;
        segundos += seg;
        dias.add(dia);
      }
    }
    const paginas = Math.round(
      rows.reduce((soma, s) => {
        if (s.item_id && s.unit_start != null && s.unit_end != null) {
          return soma + Math.max(0, s.unit_end - s.unit_start) * fracaoDaSessaoEntre(s, `${id}-01`, fimDoMes(id));
        }
        return soma;
      }, 0),
    );
    const diasLidos = dias.size;
    const diasNoMes = new Date(ano, mes + 1, 0).getDate();

    const terminadosNoMes = terminadosComData.filter((l) => l.finished_at.slice(0, 7) === id);
    const notas = terminadosNoMes
      .map((t) => estrelasPorItem.get(t.item_id))
      .filter((n): n is number => typeof n === "number" && n > 0);
    // Meta do ano como estava no fim deste mês.
    const terminadosNoAnoAteOMes = terminadosComData.filter(
      (l) => l.finished_at.slice(0, 4) === String(ano) && l.finished_at.slice(0, 7) <= id,
    ).length;

    // Livros com alguma atualização de leitura neste mês, da sessão mais
    // recente pra mais antiga. Sem nenhum, cai pros "terminei" — sempre tem
    // algo pra mostrar no cartaz.
    const idsComAtividade: string[] = [];
    const vistos = new Set<string>();
    for (const s of [...doMes].sort((a, b) => b.started_at.localeCompare(a.started_at))) {
      if (s.item_id && !vistos.has(s.item_id) && livroPorId.has(s.item_id)) {
        vistos.add(s.item_id);
        idsComAtividade.push(s.item_id);
      }
    }
    const livrosDoMes =
      idsComAtividade.length > 0
        ? idsComAtividade.map((itemId) => paraCartaz(livroPorId.get(itemId)!))
        : livrosFinalizados;

    return {
      id,
      rotulo: `${MESES[mes]} ${ano}`,
      minutos: Math.round(segundos / 60).toLocaleString("pt-BR"),
      paginas: String(paginas),
      diasLidos: `${diasLidos}/${diasNoMes}`,
      horaOuro: horaDeOuro(doMes),
      temDados: doMes.length > 0,
      livros: livrosDoMes,
      livrosDeAtividade: idsComAtividade.length > 0,
      numeros: { minutos: Math.round(segundos / 60), paginas, diasLidos },
      livrosTerminados: terminadosNoMes.length,
      notaMedia: notas.length > 0 ? notas.reduce((a, b) => a + b, 0) / notas.length : null,
      meta: alvoAno > 0 ? { atual: terminadosNoAnoAteOMes, alvo: alvoAno } : null,
      maiorSequencia: maiorSequencia(dias),
    };
  });

  return <CompartilharClient periodos={periodos} todosLivros={todosLivros} />;
}
