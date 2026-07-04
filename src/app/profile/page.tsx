import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/supabase/auth";
import { SiteHeader } from "@/components/site-header";
import { updateProfile } from "@/app/actions/profile";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const userId = await requireUserId();
  const { error, saved } = await searchParams;

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("username, display_name")
    .eq("id", userId)
    .single();

  return (
    <>
      <SiteHeader displayName={profile?.display_name ?? null} />
      <main className="flex flex-1 justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <h1 className="mb-6 font-serif text-2xl">Seu perfil</h1>
          <form
            action={updateProfile}
            className="flex flex-col gap-4 rounded-md border-2 border-ink bg-white p-6 shadow-hard"
          >
            <label className="flex flex-col gap-1 text-sm font-medium">
              Nome de exibição
              <input
                name="display_name"
                defaultValue={profile?.display_name ?? ""}
                className="rounded border-2 border-ink bg-paper px-3 py-2 focus:outline-none focus:ring-2 focus:ring-moss"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Username
              <input
                name="username"
                defaultValue={profile?.username ?? ""}
                className="rounded border-2 border-ink bg-paper px-3 py-2 focus:outline-none focus:ring-2 focus:ring-moss"
              />
            </label>
            {error && (
              <p className="text-sm font-medium text-coral">{error}</p>
            )}
            {saved && !error && (
              <p className="text-sm font-medium text-moss-dark">
                Perfil salvo.
              </p>
            )}
            <button
              type="submit"
              className="mt-2 rounded-md bg-moss px-4 py-2 font-display text-sm text-paper shadow-hard-sm"
            >
              Salvar
            </button>
          </form>
        </div>
      </main>
    </>
  );
}
