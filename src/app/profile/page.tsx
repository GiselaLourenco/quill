import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/supabase/auth";
import { updateProfile } from "@/app/actions/profile";
import { quillPhase } from "@/lib/gamification";
import { PerfilClient } from "./perfil-client";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const userId = await requireUserId();
  const { error, saved } = await searchParams;

  const supabase = await createClient();
  const year = new Date().getFullYear();

  const [
    { data: profile },
    { data: annualGoal },
    { count: finishedThisYear },
    { count: totalBooks },
    { count: totalFriends },
    { data: sessionRows },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("username, display_name")
      .eq("id", userId)
      .single(),
    supabase
      .from("goals")
      .select("target_value")
      .eq("type", "books_per_year")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("media_items")
      .select("id", { count: "exact", head: true })
      .eq("status", "finished")
      .gte("finished_at", `${year}-01-01`)
      .lte("finished_at", `${year}-12-31`),
    supabase
      .from("media_items")
      .select("id", { count: "exact", head: true }),
    supabase
      .from("friendships")
      .select("id", { count: "exact", head: true })
      .or(`user_a.eq.${userId},user_b.eq.${userId}`),
    supabase
      .from("sessions")
      .select("duration_seconds"),
  ]);

  const totalFinished = finishedThisYear ?? 0;
  const annualTarget = annualGoal?.target_value ?? 0;

  const phase = annualGoal
    ? quillPhase(
        Math.min(100, Math.round((totalFinished / annualGoal.target_value) * 100)),
      )
    : null;

  const totalSeconds = (sessionRows ?? []).reduce(
    (acc, s) => acc + (s.duration_seconds ?? 0),
    0,
  );
  const totalHours = Math.round(totalSeconds / 3600);

  return (
    <PerfilClient
      displayName={profile?.display_name ?? null}
      username={profile?.username ?? null}
      totalLivros={totalBooks ?? 0}
      totalHoras={totalHours}
      totalAmigos={totalFriends ?? 0}
      totalFinished={totalFinished}
      annualTarget={annualTarget}
      phaseLabel={phase?.label ?? null}
      phaseEmoji={phase?.emoji ?? null}
      updateProfileAction={updateProfile}
      formError={error ?? null}
      formSaved={!!saved && !error}
    />
  );
}
