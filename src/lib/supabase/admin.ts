import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Client com service_role — SÓ pode ser usado em código de servidor (Server
// Action / Route Handler). Existe porque a tabela `profiles` só é legível por
// quem já está autenticado, e o cadastro precisa checar se um username está
// livre ANTES de existir usuário. Nunca devolver linhas dessa consulta pro
// browser: só o booleano.
export function createAdminClient() {
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!chave) return null;

  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    chave,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
