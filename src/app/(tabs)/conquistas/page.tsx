import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/supabase/auth";
import { computeStreak, computeMaxSessionPages, type SessionRow } from "@/lib/gamification";
import { evaluateAchievements, type AchievementTier } from "@/lib/achievements";

const TIER_LABEL: Record<AchievementTier, string> = {
  bronze: "bronze",
  prata: "prata",
  ouro: "ouro",
};

const TIER_COLOR: Record<AchievementTier, string> = {
  bronze: "#EF9F27",
  prata: "#8A7F6B",
  ouro: "#0F6E56",
};

export default async function ConquistasPage() {
  const userId = await requireUserId();
  const supabase = await createClient();

  const [{ count: sessionsCount }, { count: booksFinished }, { data: sessions }] =
    await Promise.all([
      supabase
        .from("sessions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId),
      supabase
        .from("media_items")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("status", "finished"),
      supabase
        .from("sessions")
        .select("started_at, duration_seconds, unit_start, unit_end, item_id")
        .eq("user_id", userId),
    ]);

  const sessionRows = (sessions ?? []) as SessionRow[];
  const ctx = {
    sessionsCount: sessionsCount ?? 0,
    booksFinished: booksFinished ?? 0,
    streakRecord: computeStreak(sessionRows).record,
    maxSessionPages: computeMaxSessionPages(sessionRows),
  };

  const evaluated = evaluateAchievements(ctx);
  const metKeys = evaluated.filter((e) => e.met).map((e) => e.achievement.key);

  if (metKeys.length > 0) {
    await supabase.from("user_achievements").upsert(
      metKeys.map((achievement_key) => ({ user_id: userId, achievement_key })),
      { onConflict: "user_id,achievement_key", ignoreDuplicates: true },
    );
  }

  const metSet = new Set(metKeys);

  return (
    <>
      <header className="flex items-center gap-2 border-b-2 border-ink bg-white px-4 py-3">
        <Link href="/" aria-label="Voltar" className="text-lg">
          ←
        </Link>
        <span className="font-serif text-lg">Conquistas</span>
      </header>
      <main className="mx-auto w-full max-w-sm flex-1 px-4 py-6">
        <div className="flex flex-col gap-2">
          {evaluated.map(({ achievement, progress, met }) => {
            const unlocked = met || metSet.has(achievement.key);
            return (
              <div
                key={achievement.key}
                className={`flex items-center gap-3 rounded-md border-2 border-cover-border px-3 py-2.5 ${
                  unlocked ? "" : "opacity-55"
                }`}
              >
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
                  style={{
                    background: unlocked ? TIER_COLOR[achievement.tier] : "#8A7F6B",
                    color: unlocked && achievement.tier === "bronze" ? "#2C2C2A" : "#F5ECD7",
                  }}
                >
                  ★
                </div>
                <div className="flex-1">
                  <div className="text-[12.5px] font-medium">{achievement.name}</div>
                  <div className="text-[10.5px] text-ink/65">
                    {TIER_LABEL[achievement.tier]} ·{" "}
                    {unlocked
                      ? "desbloqueada"
                      : `faltam ${achievement.criteria.target - progress}`}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </>
  );
}
