import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/supabase/auth";
import { MAX_PILLS, pillsEscolhidas } from "@/lib/pills";
import { PersonalizarClient } from "./personalizar-client";

export default async function PersonalizarPage() {
  const userId = await requireUserId();

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("metrics_prefs")
    .eq("id", userId)
    .single();

  const escolhidas = pillsEscolhidas(profile?.metrics_prefs);

  return (
    <>
      <header className="flex items-center gap-2 border-b-2 border-ink bg-white px-4 py-3">
        <Link href="/" aria-label="Voltar" className="text-lg">
          ←
        </Link>
        <span className="font-serif text-lg">Personalizar painel</span>
      </header>
      <main className="mx-auto w-full max-w-sm flex-1 px-4 py-6">
        <p className="mb-4 text-sm text-ink/65">
          Escolha o que aparece no painel da home — até {MAX_PILLS} números.
        </p>
        <PersonalizarClient inicial={escolhidas} />
      </main>
    </>
  );
}
