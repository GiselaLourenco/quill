import type { SupabaseClient } from "@supabase/supabase-js";
import { computeScores, daysRemaining, type ScoringMetric } from "@/lib/challenges";
import { nomeExibicao } from "@/lib/nome-exibicao";
import { AVATAR_FUNDO_PADRAO } from "@/lib/avatares";
import { todayLocalDateKey } from "@/lib/date-br";
import type { DesafioCartaz, MembroCartaz } from "./cartaz-desafio";

const MESES_CURTOS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** Como a métrica do ranking aparece no cartaz. */
const METRICA: Record<ScoringMetric, { rotulo: string; lida: string; unidade: [string, string] }> = {
  pages: { rotulo: "Páginas", lida: "Páginas lidas", unidade: ["página", "páginas"] },
  chapters: { rotulo: "Capítulos", lida: "Capítulos lidos", unidade: ["capítulo", "capítulos"] },
  active_days: { rotulo: "Dias ativos", lida: "Dias lidos", unidade: ["dia", "dias"] },
  check_ins: { rotulo: "Livros terminados", lida: "Livros lidos", unidade: ["livro", "livros"] },
  minutes: { rotulo: "Minutos", lida: "Minutos lidos", unidade: ["minuto", "minutos"] },
};

const diaMes = (chave: string, comAno: boolean) =>
  `${Number(chave.slice(8, 10))} ${MESES_CURTOS[Number(chave.slice(5, 7)) - 1]}${comAno ? ` ${chave.slice(0, 4)}` : ""}`;

function periodo(inicio: string | null, fim: string | null): string {
  if (inicio && fim) {
    const anosDiferentes = inicio.slice(0, 4) !== fim.slice(0, 4);
    return `${diaMes(inicio, anosDiferentes)} – ${diaMes(fim, anosDiferentes)}`;
  }
  if (inicio) return `desde ${diaMes(inicio, false)}`;
  if (fim) return `até ${diaMes(fim, false)}`;
  return "sem data";
}

const diasEntre = (a: string, b: string) =>
  Math.round((+new Date(`${b}T00:00:00Z`) - +new Date(`${a}T00:00:00Z`)) / 86_400_000);

/** Título longo perde o subtítulo ("Duna: edição de luxo" → "Duna"), senão a faixa fica ilegível. */
function tituloCurto(titulo: string): string {
  if (titulo.length <= 30) return titulo;
  const antes = titulo.split(/\s*[:(–—]\s*/)[0]!.trim();
  return antes.length >= 3 ? antes : titulo;
}

type SessaoRow = {
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  unit_start: number | null;
  unit_end: number | null;
  chapter_start: number | null;
  chapter_end: number | null;
};

/**
 * Todos os desafios de que a pessoa participa, já no formato do cartaz:
 * ranking (mesma conta da tela do desafio), totais do grupo e o período.
 * Em andamento primeiro (o mais recente no topo), depois os que ainda vão
 * começar, depois os encerrados.
 */
export async function carregarDesafiosDoCartaz(
  supabase: SupabaseClient,
  userId: string,
): Promise<DesafioCartaz[]> {
  const { data: minhas } = await supabase
    .from("group_members")
    .select("groups!inner(id, name, format, scoring_metric, starts_at, ends_at, item_id)")
    .eq("user_id", userId);

  type GrupoRow = {
    id: string;
    name: string;
    format: string;
    scoring_metric: string | null;
    starts_at: string | null;
    ends_at: string | null;
    item_id: string | null;
  };
  const grupos = ((minhas ?? []) as unknown as { groups: GrupoRow }[])
    .map((m) => m.groups)
    .filter((g) => g && g.format === "challenge");
  if (grupos.length === 0) return [];

  const ids = grupos.map((g) => g.id);
  const itemIds = grupos.map((g) => g.item_id).filter((x): x is string => !!x);
  const [{ data: checkins }, { data: livros }] = await Promise.all([
    supabase
      .from("challenge_checkins")
      .select("group_id, user_id, finished_item_id, session:sessions(started_at, ended_at, duration_seconds, unit_start, unit_end, chapter_start, chapter_end)")
      .in("group_id", ids),
    itemIds.length
      ? supabase.from("media_items").select("id, title").in("id", itemIds)
      : Promise.resolve({ data: [] as { id: string; title: string | null }[] }),
  ]);

  const pessoas = Array.from(new Set([userId, ...(checkins ?? []).map((c) => c.user_id as string)]));
  const { data: perfis } = await supabase
    .from("profiles")
    .select("id, display_name, username, avatar_url, avatar_zoom, avatar_bg")
    .in("id", pessoas);
  const perfilPorId = new Map(
    (perfis ?? []).map((p) => [
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
  const tituloLivro = new Map((livros ?? []).map((l) => [l.id as string, (l.title as string | null) ?? null]));

  const hoje = todayLocalDateKey();
  const desafios = grupos.map((g): { desafio: DesafioCartaz; ordem: [number, string] } => {
    const metric = (g.scoring_metric as ScoringMetric) ?? "active_days";
    const doGrupo = (checkins ?? []).filter((c) => c.group_id === g.id);
    const sessoes = doGrupo.map((c) => c.session as unknown as SessaoRow | null);

    const scores = computeScores(
      doGrupo.map((c) => ({
        user_id: c.user_id as string,
        finished_item_id: (c.finished_item_id as string | null) ?? null,
        session: c.session as unknown as SessaoRow | null,
      })),
      metric,
      { inicio: g.starts_at, fim: g.ends_at },
    );
    // Mesma ordem e empates da tela do desafio: empate divide a posição e,
    // entre empatados, você vem primeiro.
    const ordenados = Array.from(scores.entries()).sort(
      (a, b) => b[1] - a[1] || Number(b[0] === userId) - Number(a[0] === userId),
    );
    const ranking: MembroCartaz[] = ordenados.map(([uid, pontos]) => ({
      ...perfilDe(uid),
      pontos,
      posicao: ordenados.findIndex(([, s]) => s === pontos) + 1,
      eu: uid === userId,
    }));

    const encerrado = Boolean(g.ends_at && g.ends_at < hoje);
    const naoComecou = Boolean(g.starts_at && g.starts_at > hoje);
    const restantes = daysRemaining(g.ends_at);
    const restam = naoComecou
      ? `começa em ${diaMes(g.starts_at!, false)}`
      : encerrado
        ? "encerrado"
        : restantes == null
          ? "sem data de fim"
          : restantes === 0
            ? "termina hoje"
            : restantes === 1
              ? "falta 1 dia"
              : `faltam ${restantes} dias`;

    let dias = "—";
    if (g.starts_at && !naoComecou) {
      const decorridos = diasEntre(g.starts_at, encerrado && g.ends_at ? g.ends_at : hoje) + 1;
      dias = g.ends_at ? `${decorridos}/${diasEntre(g.starts_at, g.ends_at) + 1}` : String(decorridos);
    }

    const paginas = sessoes.reduce(
      (soma, s) => soma + (s && s.unit_start != null && s.unit_end != null ? Math.max(0, s.unit_end - s.unit_start) : 0),
      0,
    );
    const minutos = sessoes.reduce((soma, s) => soma + (s?.duration_seconds ?? 0) / 60, 0);
    const livrosTerminados = new Set(
      doGrupo.filter((c) => c.finished_item_id).map((c) => `${c.user_id}:${c.finished_item_id}`),
    ).size;

    const eu = ranking.find((r) => r.eu);
    const desafio: DesafioCartaz = {
      id: g.id,
      nome: g.name,
      periodo: periodo(g.starts_at, g.ends_at),
      restam,
      encerrado,
      livro: g.item_id ? tituloCurto(tituloLivro.get(g.item_id) ?? "Livro único") : "Livro livre",
      metricaRotulo: METRICA[metric].rotulo,
      metricaLida: METRICA[metric].lida,
      unidade: METRICA[metric].unidade,
      pessoas: new Set(doGrupo.map((c) => c.user_id as string)).size,
      ranking,
      eu: eu ?? { ...perfilDe(userId), pontos: 0, posicao: 0, eu: true },
      totais: {
        paginas,
        livros: livrosTerminados,
        dias,
        checkins: doGrupo.length,
        horas: `${Math.round(minutos / 60)}h`,
      },
    };
    return {
      desafio,
      // Em andamento (0) → ainda vai começar (1) → encerrado (2); dentro de
      // cada grupo, o mais recente primeiro.
      ordem: [encerrado ? 2 : naoComecou ? 1 : 0, (encerrado ? g.ends_at : g.starts_at) ?? ""],
    };
  });

  return desafios
    .sort((a, b) => a.ordem[0] - b.ordem[0] || b.ordem[1].localeCompare(a.ordem[1]))
    .map((x) => x.desafio);
}
