import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/supabase/auth";
import { GoalForm } from "@/components/goal-form";
import {
  goalProgress,
  computePagesPerDay,
  computeMinutesPerDay,
  type SessionRow,
} from "@/lib/gamification";

export default async function MetasPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireUserId();
  const { error } = await searchParams;
  const year = new Date().getFullYear();

  const supabase = await createClient();
  const [{ data: sessions }, { count: finishedThisYear }, { data: goals }] =
    await Promise.all([
      supabase
        .from("sessions")
        .select("started_at, duration_seconds, unit_start, unit_end, chapter_start, chapter_end, quality_tags, item_id"),
      supabase
        .from("media_items")
        .select("id", { count: "exact", head: true })
        .eq("status", "finished")
        .gte("finished_at", `${year}-01-01`)
        .lte("finished_at", `${year}-12-31`),
      supabase
        .from("goals")
        .select("id, type, target_value, period_start, period_end")
        .order("created_at", { ascending: false }),
    ]);

  const sessionRows = (sessions ?? []) as SessionRow[];
  const goalCtx = {
    sessions: sessionRows,
    pagesPerDay: computePagesPerDay(sessionRows),
    minutesPerDay: computeMinutesPerDay(sessionRows),
    finishedThisYear: finishedThisYear ?? 0,
  };

  return (
    <>
      <header className="flex items-center gap-2 border-b-2 border-ink bg-white px-4 py-3">
        <Link href="/" aria-label="Voltar" className="text-lg">
          ←
        </Link>
        <span className="font-serif text-lg">Metas</span>
      </header>
      <main className="mx-auto w-full max-w-sm flex-1 px-4 py-6">
        {error && <p className="mb-4 text-sm font-medium text-coral">{error}</p>}

        <div className="mb-5 flex flex-col gap-2">
          {(goals ?? []).map((g) => {
            const progress = goalProgress(g, goalCtx);
            return (
              <div
                key={g.id}
                className="rounded-md border-2 border-cover-border px-3 py-2.5"
              >
                <div className="mb-1.5 flex justify-between text-xs">
                  <span>{progress.label}</span>
                  <span className="text-ink/65">
                    {progress.current} / {g.target_value}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full border border-cover-border bg-white">
                  <div
                    className="h-full bg-moss-dark"
                    style={{ width: `${progress.percent}%` }}
                  />
                </div>
                {progress.dailyTargetLabel && (
                  <div className="mt-1.5 text-[10.5px] text-ink/60">
                    {progress.dailyTargetLabel}
                  </div>
                )}
              </div>
            );
          })}
          {(!goals || goals.length === 0) && (
            <p className="text-sm text-ink/65">Nenhuma meta ainda.</p>
          )}
        </div>

        <GoalForm />
      </main>
    </>
  );
}
