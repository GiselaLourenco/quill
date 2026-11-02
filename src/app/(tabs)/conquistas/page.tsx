import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/supabase/auth";
import { evaluateAchievements } from "@/lib/achievements";
import { datasDeDesbloqueio, loadAchievementData } from "@/lib/achievement-context";
import { montarConquistas } from "@/lib/conquistas-view";
import { ColecaoConquistas } from "@/components/conquistas";

export default async function ConquistasPage() {
  const userId = await requireUserId();
  const supabase = await createClient();

  const { ctx } = await loadAchievementData(supabase, userId);
  const feitas = evaluateAchievements(ctx)
    .filter((e) => e.met)
    .map((e) => e.achievement.key);
  const datas = await datasDeDesbloqueio(supabase, userId, feitas);

  return <ColecaoConquistas conquistas={montarConquistas(ctx, datas)} />;
}
