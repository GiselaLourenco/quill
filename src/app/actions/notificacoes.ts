"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/supabase/auth";

/**
 * Marca "já vi tudo até agora".
 *
 * Não apaga nada — não haveria o que apagar: um pedido de amizade pendente
 * continua pendente depois de limpar, e segue acessível pelos filtros por
 * tipo. O que zera é o contador.
 */
export async function limparNotificacoes(): Promise<{ error: string | null }> {
  const userId = await requireUserId();
  const supabase = await createClient();

  const { error } = await supabase
    .from("profiles")
    .update({ notificacoes_limpas_em: new Date().toISOString() })
    .eq("id", userId);

  if (error) return { error: "Não foi possível limpar." };

  revalidatePath("/notificacoes");
  revalidatePath("/profile");
  revalidatePath("/");
  return { error: null };
}
