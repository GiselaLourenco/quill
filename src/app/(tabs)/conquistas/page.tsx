import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/supabase/auth";
import { loadAchievementData } from "@/lib/achievement-context";
import { carregarConquistas } from "@/lib/conquistas";
import { ConquistasClient } from "./conquistas-client";

export default async function ConquistasPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const userId = await requireUserId();
  const supabase = await createClient();
  const { ctx } = await loadAchievementData(supabase, userId);
  const conquistas = await carregarConquistas(supabase, userId, ctx);
  const { c } = await searchParams;

  return (
    <ConquistasClient
      conquistas={conquistas}
      abertaInicial={conquistas.some((x) => x.id === c) ? (c as string) : null}
    />
  );
}
