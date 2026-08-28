import { createClient } from "@/lib/supabase/server";
import { ResetClient } from "./reset-client";

// A troca do `code` por sessão acontece em /auth/callback, antes de chegar
// aqui. Então se não há sessão (ou veio `erro`), o link venceu ou já foi
// usado — não adianta mostrar o formulário.
export default async function ResetSenhaPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;
  const supabase = await createClient();
  // getClaims() e não getUser(): mesma escolha do proxy de sessão — valida o
  // token sem depender de uma chamada extra ao Auth server.
  const { data } = await supabase.auth.getClaims();

  return <ResetClient linkValido={!erro && !!data?.claims} />;
}
