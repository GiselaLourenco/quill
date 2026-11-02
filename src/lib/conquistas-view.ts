import { evaluateAchievements, type AchievementContext, type AchievementTier } from "@/lib/achievements";
import { localDateKey } from "@/lib/date-br";

/** O que as telas de conquista (perfil e /conquistas) recebem do servidor. */
export type ConquistaView = {
  id: string;
  nome: string;
  descricao: string;
  nivel: AchievementTier;
  icone: string;
  progresso: number;
  alvo: number;
  unidade: string;
  desbloqueada: boolean;
  /** "12 jul" — só quando a data foi registrada. */
  desbloqueadaEm: string | null;
  /** Para ordenar as recentes; ISO. */
  desbloqueadaEmIso: string | null;
};

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function dataCurta(iso: string): string {
  const [ano, mes, dia] = localDateKey(iso).split("-").map(Number);
  const atual = Number(localDateKey(new Date()).slice(0, 4));
  return `${dia} ${MESES[mes - 1]}${ano === atual ? "" : ` ${ano}`}`;
}

export function montarConquistas(
  ctx: AchievementContext,
  datas: Record<string, string>,
): ConquistaView[] {
  // Só as da coleção (as 33 da arte). As de livro específico existem pra
  // liberar foto de perfil e ficam fora da contagem.
  return evaluateAchievements(ctx)
    .filter(({ achievement }) => achievement.criteria.type === "metric")
    .map(({ achievement: a, progress, met }) => {
      const iso = met ? (datas[a.key] ?? null) : null;
      return {
        id: a.key,
        nome: a.name,
        descricao: a.description,
        nivel: a.tier,
        icone: a.icon ?? "/img/conquistas/livro.webp",
        progresso: Math.min(progress, a.criteria.target),
        alvo: a.criteria.target,
        unidade: a.unit ?? "",
        desbloqueada: met,
        desbloqueadaEm: iso ? dataCurta(iso) : null,
        desbloqueadaEmIso: iso,
      };
    });
}
