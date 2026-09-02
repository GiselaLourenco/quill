"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/supabase/auth";
import { isPillKey, MAX_PILLS } from "@/lib/pills";

export async function updateMetricsPrefs(formData: FormData) {
  const userId = await requireUserId();

  // Corta no servidor também: o limite não pode depender só do formulário.
  const selected = formData
    .getAll("pills")
    .map(String)
    .filter(isPillKey)
    .slice(0, MAX_PILLS);

  const supabase = await createClient();
  await supabase
    .from("profiles")
    .update({ metrics_prefs: selected })
    .eq("id", userId);

  revalidatePath("/");
  redirect("/");
}
