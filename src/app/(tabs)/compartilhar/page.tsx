import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/supabase/auth";
import CompartilharClient, { type PeriodoStats, type LivroCartaz } from "./compartilhar-client";

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

/** Últimos N meses (mais antigo primeiro), como chaves "AAAA-MM". */
function ultimosMeses(qtd: number): { id: string; ano: number; mes: number }[] {
  const hoje = new Date();
  const out: { id: string; ano: number; mes: number }[] = [];
  for (let i = qtd - 1; i >= 0; i -= 1) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    out.push({ id: `${d.getFullYear()}-${pad(d.getMonth() + 1)}`, ano: d.getFullYear(), mes: d.getMonth() });
  }
  return out;
}

/** Hora em que a pessoa mais começa a ler — o "horário de ouro". */
function horaDeOuro(sessions: SessionRow[]): string {
  if (sessions.length === 0) return "—";
  const contagem = new Map<number, number>();
  for (const s of sessions) {
    const hora = new Date(s.started_at).getHours();
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
  const [{ data: sessions }, { data: livros }, { data: ratings }] = await Promise.all([
    supabase
      .from("sessions")
      .select("started_at, duration_seconds, unit_start, unit_end, item_id")
      .eq("user_id", userId)
      .gte("started_at", `${inicio}T00:00:00`),
    supabase
      .from("media_items")
      .select("id, title, creator, status")
      .eq("user_id", userId)
      .in("status", ["reading", "finished"])
      .order("created_at", { ascending: false })
      .limit(40),
    supabase.from("ratings").select("item_id, stars").eq("user_id", userId),
  ]);

  const rows = (sessions ?? []) as SessionRow[];

  const periodos: PeriodoStats[] = meses.map(({ id, ano, mes }) => {
    const doMes = rows.filter((s) => s.started_at.slice(0, 7) === id);
    const segundos = doMes.reduce((soma, s) => soma + (s.duration_seconds ?? 0), 0);
    const paginas = doMes.reduce((soma, s) => {
      if (s.item_id && s.unit_start != null && s.unit_end != null) {
        return soma + Math.max(0, s.unit_end - s.unit_start);
      }
      return soma;
    }, 0);
    const diasLidos = new Set(doMes.map((s) => s.started_at.slice(0, 10))).size;
    const diasNoMes = new Date(ano, mes + 1, 0).getDate();

    return {
      id,
      rotulo: `${MESES[mes]} ${ano}`,
      minutos: Math.round(segundos / 60).toLocaleString("pt-BR"),
      paginas: String(paginas),
      diasLidos: `${diasLidos}/${diasNoMes}`,
      horaOuro: horaDeOuro(doMes),
      temDados: doMes.length > 0,
    };
  });

  const estrelasPorItem = new Map((ratings ?? []).map((r) => [r.item_id, r.stars]));

  const livrosCartaz: LivroCartaz[] = (livros ?? []).map((l) => ({
    id: l.id as string,
    titulo: (l.title as string) ?? "Sem título",
    autor: (l.creator as string | null) ?? "",
    nota: estrelasPorItem.get(l.id) ?? null,
  }));

  return <CompartilharClient periodos={periodos} livros={livrosCartaz} />;
}
