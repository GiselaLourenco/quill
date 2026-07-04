"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/supabase/auth";

export async function updateProfile(formData: FormData) {
  const userId = await requireUserId();
  const displayName = String(formData.get("display_name") ?? "").trim();
  const username = String(formData.get("username") ?? "").trim();

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: displayName || null,
      username: username || null,
    })
    .eq("id", userId);

  if (error) {
    const message =
      error.code === "23505"
        ? "Esse username já está em uso."
        : "Não foi possível salvar o perfil.";
    redirect(`/profile?error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/profile");
  redirect("/profile?saved=1");
}
