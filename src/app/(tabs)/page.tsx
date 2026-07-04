import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/supabase/auth";
import { SiteHeader } from "@/components/site-header";
import { computeGlobalStats, formatDuration } from "@/lib/reading-stats";

export default async function QuillHomePage() {
  const userId = await requireUserId();

  const supabase = await createClient();
  const [{ data: profile }, { data: sessions }, { count: finishedCount }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("display_name")
        .eq("id", userId)
        .single(),
      supabase.from("sessions").select("started_at, duration_seconds"),
      supabase
        .from("media_items")
        .select("id", { count: "exact", head: true })
        .eq("status", "finished"),
    ]);

  const stats = computeGlobalStats(sessions ?? []);

  return (
    <>
      <SiteHeader displayName={profile?.display_name ?? null} />
      <main className="mx-auto w-full max-w-sm flex-1 px-4 py-6">
        <p className="mb-4 text-sm text-ink/65">Seu progresso de leitura</p>
        <div className="mb-3 grid grid-cols-2 gap-2">
          <div className="rounded-md border-2 border-cover-border py-3 text-center">
            <div className="font-serif text-lg font-semibold">
              {formatDuration(stats.totalSeconds)}
            </div>
            <div className="text-[10.5px] text-ink/65">tempo total lido</div>
          </div>
          <div className="rounded-md border-2 border-cover-border py-3 text-center">
            <div className="font-serif text-lg font-semibold">
              {finishedCount ?? 0}
            </div>
            <div className="text-[10.5px] text-ink/65">livros terminados</div>
          </div>
        </div>
        <div className="rounded-md border-2 border-cover-border py-3 text-center">
          <div className="font-serif text-lg font-semibold">
            {stats.daysRead}
          </div>
          <div className="text-[10.5px] text-ink/65">dias com leitura</div>
        </div>
      </main>
    </>
  );
}
