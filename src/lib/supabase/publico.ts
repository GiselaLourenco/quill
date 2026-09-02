import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Client sem cookie, para leituras que são iguais pra todo mundo.
 *
 * Existe por causa do cache: `unstable_cache` não pode ler cookie, então o
 * client normal (que lê a sessão) não serve lá dentro. As tabelas de arte são
 * `select` liberado pra qualquer um — o que este client alcança é exatamente
 * o que qualquer visitante já veria.
 */
export function createPublicClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

/** Tag do cache das artes — as ações do /admin invalidam por ela. */
export const TAG_ARTES = "artes";
