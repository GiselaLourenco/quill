"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/supabase/auth";

const VALID_TYPES = ["books_per_year", "pages_per_day", "minutes_per_day"];

export async function createGoal(formData: FormData) {
  const userId = await requireUserId();

  const type = String(formData.get("type") ?? "");
  const targetValue = Number(formData.get("target_value") ?? 0);
  if (!VALID_TYPES.includes(type) || !Number.isFinite(targetValue) || targetValue <= 0) {
    redirect("/metas?error=Preencha um valor alvo válido.");
  }

  let periodStart: string | null = null;
  let periodEnd: string | null = null;
  if (type === "books_per_year") {
    const year = new Date().getFullYear();
    periodStart = `${year}-01-01`;
    periodEnd = `${year}-12-31`;
  }

  const supabase = await createClient();
  await supabase.from("goals").insert({
    user_id: userId,
    type,
    target_value: targetValue,
    period_start: periodStart,
    period_end: periodEnd,
  });

  revalidatePath("/metas");
  revalidatePath("/");
  redirect("/metas");
}
