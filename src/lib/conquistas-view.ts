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

/**
 * A coleção do ano. As de livro específico (as que liberam foto de perfil)
 * valem pra vida toda — a foto não volta a bloquear — então são avaliadas no
 * `ctxVida` e aparecem feitas em qualquer ano.
 */
export function montarConquistas(
  ctx: AchievementContext,
  datas: Record<string, string>,
  ctxVida: AchievementContext,
): ConquistaView[] {
  const doAno = evaluateAchievements(ctx);
  const daVida = evaluateAchievements(ctxVida);
  return doAno
    .map((e, i) => (e.achievement.criteria.type === "specific_book" ? daVida[i] : e))
    .map(({ achievement: a, progress, met }) => {
      const iso = met ? (datas[a.key] ?? null) : null;
      return {
        id: a.key,
        nome: a.name,
        descricao: a.description,
        nivel: a.tier,
        // Conquista que dá foto mostra a própria foto: o prêmio é o chamariz.
        icone: a.avatar
          ? srcDoAvatarDeConquista(a.avatar.arquivo)
          : (a.icon ?? "/img/conquistas/livro.webp"),
        progresso: Math.min(progress, a.criteria.target),
        alvo: a.criteria.target,
        unidade: a.unit ?? "",
        desbloqueada: met,
        desbloqueadaEm: iso ? dataCurta(iso) : null,
        desbloqueadaEmIso: iso,
      };
    });
}
