"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/supabase/auth";

export async function createSession(formData: FormData) {
  const userId = await requireUserId();

  const itemId = String(formData.get("item_id") ?? "").trim() || null;
  const startedAt = String(formData.get("started_at") ?? "");
  const durationSeconds = Number(formData.get("duration_seconds") ?? 0);
  const pagesRead = Number(formData.get("pages_read") ?? 0);
  const tags = formData.getAll("tags").map(String);

  const supabase = await createClient();

  let unitStart: number | null = null;
  let unitEnd: number | null = null;

  if (itemId) {
    const { data: lastSession } = await supabase
      .from("sessions")
      .select("unit_end")
      .eq("item_id", itemId)
      .order("unit_end", { ascending: false })
      .limit(1)
      .maybeSingle();

    const previousUnitEnd = lastSession?.unit_end ?? 0;
    unitStart = previousUnitEnd;
    unitEnd = previousUnitEnd + (Number.isFinite(pagesRead) ? pagesRead : 0);
  }

  await supabase.from("sessions").insert({
    item_id: itemId,
    user_id: userId,
    started_at: startedAt,
    ended_at: new Date().toISOString(),
    duration_seconds: durationSeconds,
    unit_start: unitStart,
    unit_end: unitEnd,
    quality_tags: tags,
  });

  revalidatePath("/");
  if (itemId) revalidatePath(`/books/${itemId}`);
  redirect("/ler");
}
