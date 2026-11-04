// Fuso horário assumido para decidir "em que dia foi isso" a partir de um
// timestamp salvo em UTC. Sem timezone por usuário salvo em lugar nenhum
// ainda — aproximação razoável enquanto o público é todo do Brasil (mesma
// observação já feita em gamification.ts computeBestTimeOfDay).
export const TIMEZONE = "America/Sao_Paulo";

const dateKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const hourFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: TIMEZONE,
  hour: "2-digit",
  hourCycle: "h23",
});

const weekdayFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: TIMEZONE,
  weekday: "long",
});

/** Data (YYYY-MM-DD) de um timestamp, no fuso do Brasil — não o dia UTC cru. */
export function localDateKey(input: string | Date): string {
  const d = typeof input === "string" ? new Date(input) : input;
  return dateKeyFormatter.format(d);
}

/** "Hoje", no fuso do Brasil (não o dia UTC do servidor). */
export function todayLocalDateKey(): string {
  return localDateKey(new Date());
}

/** Hora do dia (0-23) de um timestamp, no fuso do Brasil. */
export function localHour(input: string | Date): number {
  const d = typeof input === "string" ? new Date(input) : input;
  return Number(hourFormatter.format(d));
}

/** Dia da semana por extenso ("sábado", "segunda-feira"...), no fuso do Brasil. */
export function localWeekday(input: string | Date): string {
  const d = typeof input === "string" ? new Date(input) : input;
  return weekdayFormatter.format(d);
}

/**
 * Soma/subtrai dias de uma chave YYYY-MM-DD — matemática de calendário pura
 * sobre a string, não reabre a questão de fuso (a chave em si já foi
 * resolvida no fuso certo antes de chegar aqui).
 */
export function addDaysToKey(key: string, days: number): string {
  const d = new Date(`${key}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const timeFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: TIMEZONE,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** Hora e minuto ("21:05") de um timestamp, no fuso do Brasil. */
export function localTime(input: string | Date): string {
  const d = typeof input === "string" ? new Date(input) : input;
  return timeFormatter.format(d);
}

/** YYYY-MM-DD → dd/mm/aaaa (sem passar por Date: a chave já é o dia certo). */
export function dataBR(chave: string): string {
  return `${chave.slice(8, 10)}/${chave.slice(5, 7)}/${chave.slice(0, 4)}`;
}

// ---- Sessões que atravessam a meia-noite ------------------------------
// Quem começa a ler às 23h e vai até 1h30 leu nos dois dias: o dia seguinte
// conta como lido, desde que tenha pelo menos 5 min depois da meia-noite
// (23h58 → 0h01 não vira "dois dias"). Minutos, dias e páginas (via
// fracaoDaSessaoEntre) seguem essa divisão.
export const MIN_SEGUNDOS_DIA_SEGUINTE = 5 * 60;

export type SessaoNoTempo = {
  started_at: string;
  ended_at?: string | null;
  duration_seconds?: number | null;
};

// Meia-noite (início) de uma chave YYYY-MM-DD no fuso do Brasil. O Brasil não
// tem horário de verão desde 2019, então o offset é fixo em -03:00.
function inicioDoDia(key: string): number {
  return +new Date(`${key}T00:00:00-03:00`);
}

/**
 * Segundos lidos por dia (fuso do Brasil) numa sessão. O tempo cronometrado
 * (`duration_seconds`, que já desconta pausas) é repartido na proporção do
 * relógio entre início e fim. Fatia de dia seguinte com menos de 5 min volta
 * pro primeiro dia — o total nunca muda, só onde ele cai.
 */
export function segundosPorDiaDaSessao(s: SessaoNoTempo): Map<string, number> {
  const primeiroDia = localDateKey(s.started_at);
  const inicio = +new Date(s.started_at);
  const fim = s.ended_at ? +new Date(s.ended_at) : inicio;
  const total = s.duration_seconds ?? Math.max(0, (fim - inicio) / 1000);
  const mapa = new Map<string, number>([[primeiroDia, 0]]);

  if (fim <= inicio || localDateKey(new Date(fim)) === primeiroDia) {
    mapa.set(primeiroDia, total);
    return mapa;
  }

  const relogioTotal = fim - inicio;
  let cursor = inicio;
  let dia = primeiroDia;
  while (cursor < fim) {
    const proximo = addDaysToKey(dia, 1);
    const corte = Math.min(fim, inicioDoDia(proximo));
    const segundos = (total * (corte - cursor)) / relogioTotal;
    const alvo = dia === primeiroDia || segundos >= MIN_SEGUNDOS_DIA_SEGUINTE ? dia : primeiroDia;
    mapa.set(alvo, (mapa.get(alvo) ?? 0) + segundos);
    cursor = corte;
    dia = proximo;
  }
  return mapa;
}

/** Dias (YYYY-MM-DD) em que a sessão conta como leitura. */
export function diasDaSessao(s: SessaoNoTempo): string[] {
  return [...segundosPorDiaDaSessao(s).keys()];
}

/** Conjunto de dias lidos de uma lista de sessões. */
export function diasLidos(sessions: SessaoNoTempo[]): Set<string> {
  const dias = new Set<string>();
  for (const s of sessions) for (const d of diasDaSessao(s)) dias.add(d);
  return dias;
}

/**
 * Fração (0–1) da sessão que caiu entre `inicio` e `fim` (YYYY-MM-DD,
 * inclusive), pela mesma divisão de tempo acima. Serve pra repartir páginas
 * e capítulos: 100 págs de 23h a 1h → 50 num dia, 50 no outro.
 */
export function fracaoDaSessaoEntre(s: SessaoNoTempo, inicio: string, fim: string): number {
  const porDia = segundosPorDiaDaSessao(s);
  let total = 0;
  let dentro = 0;
  for (const [dia, seg] of porDia) {
    total += seg;
    if (dia >= inicio && dia <= fim) dentro += seg;
  }
  if (total <= 0) {
    const dia = localDateKey(s.started_at);
    return dia >= inicio && dia <= fim ? 1 : 0;
  }
  return dentro / total;
}

/** Último dia (YYYY-MM-DD) de um mês "YYYY-MM". */
export function fimDoMes(prefixo: string): string {
  const [y, m] = prefixo.split("-").map(Number);
  return new Date(Date.UTC(y!, m!, 0)).toISOString().slice(0, 10);
}
