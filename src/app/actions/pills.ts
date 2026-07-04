"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/supabase/auth";
import { isPillKey } from "@/lib/pills";

export async function updateMetricsPrefs(formData: FormData) {
  const userId = await requireUserId();

  const selected = formData.getAll("pills").map(String).filter(isPillKey);

  const supabase = await createClient();
  await supabase
    .from("profiles")
    .update({ metrics_prefs: selected })
    .eq("id", userId);

  revalidatePath("/");
  redirect("/");
}
