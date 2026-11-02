import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ACHIEVEMENT_ICON,
  evaluateAchievements,
  type AchievementContext,
  type AchievementCriteria,
  type AchievementTier,
} from "@/lib/achievements";
import { srcDoAvatarDeConquista } from "@/lib/avatares";
import { localDateKey } from "@/lib/date-br";

/**
 * O que as telas de conquista (bloco do perfil, /conquistas e o detalhe)
 * precisam saber de cada conquista. Montado no servidor, a partir da
 * avaliação + das datas gravadas em `user_achievements`.
 */
export type ConquistaView = {
  id: string;
  titulo: string;
  descricao: string;
  icone: string;
  nivel: AchievementTier;
  desbloqueada: boolean;
  progresso: number;
  alvo: number;
  /** Unidade do progresso ("dias", "livros"…) — pra "5/7 dias". */
  unidade: string;
  /** "12 jul" — null quando acabou de sair e ainda não tem registro. */
  desbloqueadaEm: string | null;
  /** Pra ordenar "últimas desbloqueadas". Null = acabou de sair. */
  desbloqueadaEmIso: string | null;
};

export const NIVEIS: AchievementTier[] = ["bronze", "prata", "ouro"];

export const NIVEL_NOME: Record<AchievementTier, string> = {
  bronze: "Bronze",
  prata: "Prata",
  ouro: "Ouro",
};

/** Cor de fundo do nível — tons suaves da paleta, pra arte aparecer por cima. */
export const NIVEL_COR: Record<AchievementTier, string> = {
  bronze: "#e28d6a",
  prata: "#c9c3b4",
  ouro: "#f1ba65",
};

const UNIDADE: Record<AchievementCriteria["type"], string> = {
  sessions_count: "sessões",
  books_finished: "livros",
  streak_record: "dias",
  max_session_pages: "págs",
  specific_book: "livro",
};

const MESES_CURTOS = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

function dataCurta(iso: string): string {
  const [, mes, dia] = localDateKey(iso).split("-");
  return `${Number(dia)} ${MESES_CURTOS[Number(mes) - 1]}`;
}

/**
 * Avalia as conquistas, grava as recém-batidas em `user_achievements` (é de lá
 * que sai a data "desbloqueada em") e devolve tudo pronto pras telas.
 */
export async function carregarConquistas(
  supabase: SupabaseClient,
  userId: string,
  ctx: AchievementContext,
): Promise<ConquistaView[]> {
  const avaliadas = evaluateAchievements(ctx);

  const { data: gravadas } = await supabase
    .from("user_achievements")
    .select("achievement_key, unlocked_at")
    .eq("user_id", userId);
  const datas = new Map<string, string>(
    (gravadas ?? []).map((g) => [g.achievement_key as string, g.unlocked_at as string]),
  );

  const novas = avaliadas.filter((a) => a.met && !datas.has(a.achievement.key));
  if (novas.length > 0) {
    const agora = new Date().toISOString();
    await supabase.from("user_achievements").upsert(
      novas.map((a) => ({ user_id: userId, achievement_key: a.achievement.key })),
      { onConflict: "user_id,achievement_key", ignoreDuplicates: true },
    );
    for (const a of novas) datas.set(a.achievement.key, agora);
  }

  return avaliadas.map(({ achievement, progress, met }) => {
    // Uma vez gravada, a conquista fica — mesmo que o critério volte a
    // não bater (ex.: livro tirado de "terminei").
    const iso = datas.get(achievement.key) ?? null;
    const desbloqueada = met || iso !== null;
    return {
      id: achievement.key,
      titulo: achievement.name,
      descricao: achievement.description,
      // Conquista que dá foto mostra a própria foto: o prêmio é o chamariz.
      icone: achievement.avatar
        ? srcDoAvatarDeConquista(achievement.avatar.arquivo)
        : ACHIEVEMENT_ICON[achievement.criteria.type],
      nivel: achievement.tier,
      desbloqueada,
      progresso: Math.min(progress, achievement.criteria.target),
      alvo: achievement.criteria.target,
      unidade: UNIDADE[achievement.criteria.type],
      desbloqueadaEm: desbloqueada && iso ? dataCurta(iso) : null,
      desbloqueadaEmIso: desbloqueada ? iso : null,
    };
  });
}

/** Mais recentes primeiro. */
export function ultimasDesbloqueadas(lista: ConquistaView[]): ConquistaView[] {
  return lista
    .filter((c) => c.desbloqueada)
    // Sem data = acabou de sair agora; "9" fica depois de qualquer ISO.
    .sort((a, b) => (b.desbloqueadaEmIso ?? "9").localeCompare(a.desbloqueadaEmIso ?? "9"));
}

/** A bloqueada mais perto de sair — o "Quase lá". */
export function maisPerto(lista: ConquistaView[]): ConquistaView | null {
  const faltam = lista.filter((c) => !c.desbloqueada);
  if (faltam.length === 0) return null;
  return [...faltam].sort((a, b) => b.progresso / b.alvo - a.progresso / a.alvo)[0];
}
