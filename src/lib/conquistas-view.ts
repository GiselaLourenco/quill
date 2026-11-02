import { evaluateAchievements, type AchievementContext, type AchievementTier } from "@/lib/achievements";
import { srcDoAvatarDeConquista } from "@/lib/avatares";
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
  return evaluateAchievements(ctx).map(({ achievement: a, progress, met }) => {
    const iso = met ? (datas[a.key] ?? null) : null;
    return {
      id: a.key,
      nome: a.name,
      descricao: a.description,
      nivel: a.tier,
      // Conquista que dá foto mostra a própria foto: o prêmio é o chamariz.
      icone: a.avatar ? srcDoAvatarDeConquista(a.avatar.arquivo) : (a.icon ?? "/img/conquistas/livro.webp"),
      progresso: Math.min(progress, a.criteria.target),
      alvo: a.criteria.target,
      unidade: a.unit ?? "",
      desbloqueada: met,
      desbloqueadaEm: iso ? dataCurta(iso) : null,
      desbloqueadaEmIso: iso,
    };
  });
}
