import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/supabase/auth";
import { getFriends } from "@/lib/friends";
import NovoDesafioWizard from "./wizard";

export default async function NovoDesafioPage() {
  const userId = await requireUserId();
  const supabase = await createClient();
  const amigos = await getFriends(supabase, userId);

  const amigosFormatados = amigos.map((a) => ({
    id: a.id,
    nome: a.name,
    inicial: a.name.slice(0, 2).toUpperCase(),
  }));

  return <NovoDesafioWizard amigos={amigosFormatados} />;
}
