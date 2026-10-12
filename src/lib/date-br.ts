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
