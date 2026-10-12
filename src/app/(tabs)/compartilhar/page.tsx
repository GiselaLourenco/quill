import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/supabase/auth";
import CompartilharClient, { type PeriodoStats, type LivroCartaz } from "./compartilhar-client";
import { localDateKey, localHour, todayLocalDateKey } from "@/lib/date-br";

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
  const [{ data: sessions }, { data: livrosRows }, { data: ratings }] = await Promise.all([
    supabase
      .from("sessions")
      .select("started_at, duration_seconds, unit_start, unit_end, item_id")
      .eq("user_id", userId)
      .gte("started_at", `${inicio}T00:00:00`),
    // Estante inteira — alimenta tanto o "livro do período" quanto a busca.
    supabase
      .from("media_items")
      .select("id, title, creator, status")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase.from("ratings").select("item_id, stars").eq("user_id", userId),
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

  const periodos: PeriodoStats[] = meses.map(({ id, ano, mes }) => {
    const doMes = rows.filter((s) => localDateKey(s.started_at).slice(0, 7) === id);
    const segundos = doMes.reduce((soma, s) => soma + (s.duration_seconds ?? 0), 0);
    const paginas = doMes.reduce((soma, s) => {
      if (s.item_id && s.unit_start != null && s.unit_end != null) {
        return soma + Math.max(0, s.unit_end - s.unit_start);
      }
      return soma;
    }, 0);
    const diasLidos = new Set(doMes.map((s) => localDateKey(s.started_at))).size;
    const diasNoMes = new Date(ano, mes + 1, 0).getDate();

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
    };
  });

  return <CompartilharClient periodos={periodos} todosLivros={todosLivros} />;
}
