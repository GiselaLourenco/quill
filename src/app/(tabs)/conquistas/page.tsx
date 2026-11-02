import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/supabase/auth";
import { evaluateAchievements } from "@/lib/achievements";
import { anoAtual, datasDeDesbloqueio, loadAchievementData } from "@/lib/achievement-context";
import { montarConquistas } from "@/lib/conquistas-view";
import { ColecaoConquistas } from "@/components/conquistas";

export default async function ConquistasPage({
  searchParams,
}: {
  searchParams: Promise<{ ano?: string }>;
}) {
  const userId = await requireUserId();
  const supabase = await createClient();

  const dados = await loadAchievementData(supabase, userId);
  const atual = anoAtual();
  // O ano corrente sempre é opção, mesmo zerado (é o que a home mostra).
  const anos = [...new Set([atual, ...dados.anosComConquista])].sort((a, b) => b - a);
  const pedido = Number((await searchParams).ano);
  const ano = anos.includes(pedido) ? pedido : atual;

  const ctx = dados.doAno(ano);
  const feitas = evaluateAchievements(ctx)
    .filter((e) => e.met)
    .map((e) => e.achievement.key);
  const datas = await datasDeDesbloqueio(supabase, userId, feitas, ano);

  // Só aparece pra quem tem conquistas em mais de um ano.
  const opcoesDeAno =
    dados.anosComConquista.length > 1
      ? anos.map((a) => ({
          ano: a,
          feitas: montarConquistas(dados.doAno(a), {}).filter((c) => c.desbloqueada).length,
        }))
      : null;

  return (
    <ColecaoConquistas
      conquistas={montarConquistas(ctx, datas)}
      ano={ano}
      opcoesDeAno={opcoesDeAno}
    />
  );
}
