"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/supabase/auth";

export type MetaConfig = { type: string; target: number };

const TIPOS_CONFIGURAVEIS = ["books_per_year", "hours_per_month", "streak_days"];

export async function saveGoals(metas: MetaConfig[]) {
  const userId = await requireUserId();
  const supabase = await createClient();
  const hoje = new Date();
  const ano = hoje.getFullYear();

  for (const meta of metas) {
    if (!TIPOS_CONFIGURAVEIS.includes(meta.type)) continue;
    const alvo = Math.round(Number(meta.target));
    if (!Number.isFinite(alvo) || alvo < 0) continue;

    const { data: existente } = await supabase
      .from("goals")
      .select("id")
      .eq("user_id", userId)
      .eq("type", meta.type)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (alvo === 0) {
      if (existente) await supabase.from("goals").delete().eq("id", existente.id);
      continue;
    }

    // Período: o ano corrente para livros, o mês corrente para horas.
    let periodStart: string | null = null;
    let periodEnd: string | null = null;
    if (meta.type === "books_per_year") {
      periodStart = `${ano}-01-01`;
      periodEnd = `${ano}-12-31`;
    } else if (meta.type === "hours_per_month") {
      const mes = String(hoje.getMonth() + 1).padStart(2, "0");
      periodStart = `${ano}-${mes}-01`;
      periodEnd = new Date(ano, hoje.getMonth() + 1, 0).toISOString().slice(0, 10);
    }

    if (existente) {
      await supabase
        .from("goals")
        .update({ target_value: alvo, period_start: periodStart, period_end: periodEnd })
        .eq("id", existente.id);
    } else {
      await supabase.from("goals").insert({
        user_id: userId,
        type: meta.type,
        target_value: alvo,
        period_start: periodStart,
        period_end: periodEnd,
      });
    }
  }

  revalidatePath("/metas");
  revalidatePath("/");
  revalidatePath("/profile");
}

// Exclui uma meta. O `eq("user_id")` é redundante com a RLS, mas deixa a
// intenção explícita: ninguém apaga meta de outra pessoa.
export async function deleteGoal(goalId: string) {
  const userId = await requireUserId();
  const supabase = await createClient();

  await supabase.from("goals").delete().eq("id", goalId).eq("user_id", userId);

  revalidatePath("/metas");
  revalidatePath("/");
  revalidatePath("/profile");
}
