import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/supabase/auth";
import { SiteHeader } from "@/components/site-header";

export default async function Home() {
  const userId = await requireUserId();

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", userId)
    .single();

  return (
    <>
      <SiteHeader displayName={profile?.display_name ?? null} />
      <main className="flex flex-1 items-center justify-center px-4 py-16 text-center">
        <div>
          <h1 className="font-serif text-3xl">
            Olá, {profile?.display_name ?? "leitor"}.
          </h1>
          <p className="mt-2 text-ink/70">
            Sua estante está vazia por enquanto — ela chega na próxima fase.
          </p>
        </div>
      </main>
    </>
  );
}
