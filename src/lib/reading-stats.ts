import { diasLidos, localDateKey } from "@/lib/date-br";

export type SessionForStats = {
  started_at: string;
  ended_at?: string | null;
  duration_seconds: number | null;
  unit_start: number | null;
  unit_end: number | null;
  created_at: string;
  /** Posição informada à mão (cadastro na estante ou correção) — não é leitura. */
  cadastro?: boolean;
};

export type ReadingStats = {
  totalSeconds: number;
  daysRead: number;
  currentPage: number;
  pagesPerDay: number;
  pagesPerHour: number;
};

export type PositionSession = {
  item_id?: string;
  unit_end: number | null;
  chapter_end?: number | null;
  created_at: string;
};

/**
 * Posição mais recente (página/capítulo) a partir das sessões de UM livro —
 * "mais recente" por `created_at`, não o maior valor já visto. Página e
 * capítulo são rastreados de forma independente: uma sessão normalmente só
 * preenche um dos dois, e a correção manual (editor de posição) não pode
 * "contaminar" o outro.
 *
 * O maior valor já visto quebrava a correção pra baixo: se alguém já tinha
 * registrado a pág. 418 por engano e corrige pra 31, o maior valor continua
 * sendo 418 pra sempre — a posição "atual" trava no erro em vez de aceitar o
 * conserto.
 */
export function posicaoAtual(sessions: PositionSession[]): {
  paginas: number;
  capitulos: number;
} {
  let paginas = 0;
  let paginasAt = "";
  let capitulos = 0;
  let capitulosAt = "";
  for (const s of sessions) {
    if (s.unit_end != null && s.created_at > paginasAt) {
      paginas = s.unit_end;
      paginasAt = s.created_at;
    }
    if (s.chapter_end != null && s.created_at > capitulosAt) {
      capitulos = s.chapter_end;
      capitulosAt = s.created_at;
    }
  }
  return { paginas, capitulos };
}

/** Mesma ideia que `posicaoAtual`, para sessões de vários livros de uma vez
 * (estante, amigos) — separa por `item_id` e aplica a mesma lógica a cada um. */
export function posicaoAtualPorItem(
  sessions: (PositionSession & { item_id: string })[],
): Map<string, { paginas: number; capitulos: number }> {
  const porItem = new Map<string, PositionSession[]>();
  for (const s of sessions) {
    const lista = porItem.get(s.item_id);
    if (lista) lista.push(s);
    else porItem.set(s.item_id, [s]);
  }
  const out = new Map<string, { paginas: number; capitulos: number }>();
  for (const [itemId, lista] of porItem) out.set(itemId, posicaoAtual(lista));
  return out;
}

/**
 * Como `posicaoAtualPorItem`, mas sem cair pra 0: null quando o livro nunca
 * teve aquela posição registrada — é o que diferencia "primeira sessão do
 * livro" de "voltou pra página 0" no registro de leitura.
 */
export function posicaoRegistradaPorItem(
  sessions: (PositionSession & { item_id: string })[],
): Map<string, { pagina: number | null; capitulo: number | null }> {
  const out = new Map<string, { pagina: number | null; capitulo: number | null; pAt: string; cAt: string }>();
  for (const s of sessions) {
    const atual = out.get(s.item_id) ?? { pagina: null, capitulo: null, pAt: "", cAt: "" };
    if (s.unit_end != null && s.created_at > atual.pAt) {
      atual.pagina = s.unit_end;
      atual.pAt = s.created_at;
    }
    if (s.chapter_end != null && s.created_at > atual.cAt) {
      atual.capitulo = s.chapter_end;
      atual.cAt = s.created_at;
    }
    out.set(s.item_id, atual);
  }
  return new Map([...out].map(([id, p]) => [id, { pagina: p.pagina, capitulo: p.capitulo }]));
}

/**
 * Livro terminado mostra o total cadastrado (páginas e capítulos), não a
 * última posição registrada — quem marca "terminei" sem ter anotado cada
 * sessão, ou importou a biblioteca do Kindle, não pode ver "pág. 0 de 320".
 * Só mexe na exibição: as sessões (e o que metas/conquistas somam delas)
 * continuam as reais.
 */
export function posicaoExibida(
  pos: { paginas: number; capitulos: number } | undefined,
  item: { status: string; total_units: number | null; total_chapters?: number | null },
): { paginas: number; capitulos: number } {
  const p = pos ?? { paginas: 0, capitulos: 0 };
  if (item.status !== "finished") return p;
  return {
    paginas: item.total_units ?? p.paginas,
    capitulos: item.total_chapters ?? p.capitulos,
  };
}

/**
 * Quanto do livro conta no "Páginas" da estante: terminado conta inteiro
 * (sem total cadastrado, vale a última página registrada), "lendo" até a
 * página atual. Quero ler/abandonei/recomendado ficam de fora.
 */
export function paginasLidas(
  item: { status: string; total_units: number | null },
  paginaAtual: number | undefined,
): number {
  if (item.status === "finished") return item.total_units ?? paginaAtual ?? 0;
  if (item.status === "reading") return paginaAtual ?? 0;
  return 0;
}

/**
 * Páginas de livros terminados que nenhuma sessão da aba Ler cobriu — quem
 * cadastra um livro já lido (com data de conclusão) leu aquelas páginas, só
 * não cronometrou. Vale o total do livro menos o que as sessões reais (sem as
 * de cadastro) já somaram nele, pra não contar em dobro. Entra só em totais
 * de páginas por período, atribuído à data de conclusão — nunca em ritmo
 * (média/dia, sequência), que depende de saber o dia da leitura.
 */
export function paginasDeLivrosTerminados(
  /** Leituras terminadas no período — o mesmo livro aparece uma vez por leitura. */
  livros: { id: string; total_units: number | null; finished_at?: string | null }[],
  sessoesReais: {
    item_id: string | null;
    unit_start: number | null;
    unit_end: number | null;
    started_at?: string;
  }[],
  /** Todas as leituras terminadas desses livros (de qualquer período). */
  todosTerminos: { id: string; finished_at?: string | null }[] = livros,
): number {
  const sessoesPorItem = new Map<string, typeof sessoesReais>();
  for (const s of sessoesReais) {
    if (!s.item_id || s.unit_start == null || s.unit_end == null) continue;
    const lista = sessoesPorItem.get(s.item_id);
    if (lista) lista.push(s);
    else sessoesPorItem.set(s.item_id, [s]);
  }
  const terminosPorItem = new Map<string, string[]>();
  for (const t of todosTerminos) {
    const lista = terminosPorItem.get(t.id) ?? [];
    if (t.finished_at) lista.push(t.finished_at);
    terminosPorItem.set(t.id, lista);
  }

  // Livro relido: cada leitura só desconta as sessões dela — as do dia
  // seguinte ao término anterior até o dia em que terminou. Livro lido uma
  // vez desconta todas (regra de sempre).
  const lidasNaLeitura = (id: string, fim: string | null | undefined) => {
    const datas = terminosPorItem.get(id) ?? [];
    const releu = datas.length > 1 && fim != null;
    const anterior = releu ? (datas.filter((d) => d < fim).sort().at(-1) ?? null) : null;
    let soma = 0;
    for (const s of sessoesPorItem.get(id) ?? []) {
      if (releu && s.started_at) {
        const dia = localDateKey(s.started_at);
        if (dia > fim || (anterior != null && dia <= anterior)) continue;
      }
      soma += Math.max(0, s.unit_end! - s.unit_start!);
    }
    return soma;
  };

  return livros.reduce(
    (soma, l) => soma + Math.max(0, (l.total_units ?? 0) - lidasNaLeitura(l.id, l.finished_at)),
    0,
  );
}

export function computeReadingStats(sessions: SessionForStats[]): ReadingStats {
  const totalSeconds = sessions.reduce(
    (sum, s) => sum + (s.duration_seconds ?? 0),
    0,
  );

  // A página atual leva em conta tudo, inclusive o cadastro. Já o ritmo só
  // olha o que foi lido no app: dias e páginas de posição informada à mão
  // (ex.: "já estava na 288 quando adicionei") não contam como leitura.
  const lidas = sessions.filter((s) => !s.cadastro);
  const days = diasLidos(lidas); // YYYY-MM-DD, fuso do Brasil; virar a noite conta 2 dias

  const currentPage = posicaoAtual(sessions).paginas;
  const paginasNoApp = lidas.reduce(
    (soma, s) =>
      s.unit_start != null && s.unit_end != null
        ? soma + Math.max(0, s.unit_end - s.unit_start)
        : soma,
    0,
  );

  const daysRead = days.size;
  const pagesPerDay = daysRead > 0 ? Math.round(paginasNoApp / daysRead) : 0;
  const pagesPerHour =
    totalSeconds > 0 ? Math.round((paginasNoApp / totalSeconds) * 3600) : 0;

  return { totalSeconds, daysRead, currentPage, pagesPerDay, pagesPerHour };
}

// "Nesse ritmo, você termina em ~X dias (dd/mm)" — usa o ritmo médio do
// livro (não só os últimos dias, por simplicidade) e as páginas restantes.
export function predictFinish(
  stats: ReadingStats,
  totalUnits: number | null,
): { daysRemaining: number; dateLabel: string } | null {
  if (!totalUnits) return null;
  const pagesRemaining = totalUnits - stats.currentPage;
  if (pagesRemaining <= 0 || stats.pagesPerDay <= 0) return null;

  const daysRemaining = Math.ceil(pagesRemaining / stats.pagesPerDay);
  const target = new Date(Date.now() + daysRemaining * 86_400_000);
  const dateLabel = `${String(target.getDate()).padStart(2, "0")}/${String(
    target.getMonth() + 1,
  ).padStart(2, "0")}`;

  return { daysRemaining, dateLabel };
}

export type GlobalStats = { totalSeconds: number; daysRead: number };

// Estatísticas globais (aba "Quill") — não dependem de um livro específico,
// então não fazem sentido páginas/dia ou posição atual.
export function computeGlobalStats(
  sessions: { started_at: string; ended_at?: string | null; duration_seconds: number | null }[],
): GlobalStats {
  const totalSeconds = sessions.reduce(
    (sum, s) => sum + (s.duration_seconds ?? 0),
    0,
  );
  return { totalSeconds, daysRead: diasLidos(sessions).size };
}

export function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours === 0) return `${minutes}min`;
  return `${hours}h ${minutes}min`;
}

export function formatTimer(elapsedSeconds: number): string {
  const hours = Math.floor(elapsedSeconds / 3600);
  const minutes = Math.floor((elapsedSeconds % 3600) / 60);
  const seconds = Math.floor(elapsedSeconds % 60);
  const pad = (n: number) => String(n).padStart(2, "0");
  return hours > 0
    ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`;
}
