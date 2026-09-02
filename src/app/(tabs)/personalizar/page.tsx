import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/supabase/auth";
import { updateMetricsPrefs } from "@/app/actions/pills";
import { PILL_CATALOG, MAX_PILLS, pillsEscolhidas } from "@/lib/pills";

export default async function PersonalizarPage() {
  const userId = await requireUserId();

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("metrics_prefs")
    .eq("id", userId)
    .single();

  const selected = new Set(pillsEscolhidas(profile?.metrics_prefs));

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
        <form action={updateMetricsPrefs} className="flex flex-col gap-3">
          {PILL_CATALOG.map((pill) => (
            <label
              key={pill.key}
              className="flex items-center gap-3 rounded-md border-2 border-cover-border px-3 py-2.5"
            >
              <input
                type="checkbox"
                name="pills"
                value={pill.key}
                defaultChecked={selected.has(pill.key)}
                className="h-4 w-4 accent-moss-dark"
              />
              <span className="text-sm">{pill.label}</span>
            </label>
          ))}
          <button
            type="submit"
            className="mt-3 rounded-md border-2 border-ink bg-moss-dark px-4 py-2.5 font-display text-sm text-paper shadow-hard-sm"
          >
            Salvar
          </button>
        </form>
      </main>
    </>
  );
}
