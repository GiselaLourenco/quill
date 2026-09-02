import { createClient } from "@/lib/supabase/server";
import { pillsEscolhidas, rotuloDaPill } from "@/lib/pills";
import { requireUserId } from "@/lib/supabase/auth";
import { updateAvatar } from "@/app/actions/profile";
import { logout, deleteAccount } from "@/app/actions/auth";
import { toggleCompete } from "@/app/actions/groups";
import { computeStreak, quillPhase, computeMaxSessionPages, type SessionRow } from "@/lib/gamification";
import { evaluateAchievements, ACHIEVEMENT_ICON } from "@/lib/achievements";
import { getFriends, getFriendsShelf, getPedidosRecebidos } from "@/lib/friends";
import { PerfilClient, type BadgeView, type DesafioRanking } from "./perfil-client";

const MESES_CURTOS = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

const BADGE_COR: Record<string, string> = {
  bronze: "bg-mustard",
  prata: "bg-moss",
  ouro: "bg-coral",
};

export default async function ProfilePage() {
  const userId = await requireUserId();

  const supabase = await createClient();
  const year = new Date().getFullYear();

  const [
    { data: profile },
    { data: annualGoal },
    { count: finishedThisYear },
    { count: totalBooks },
    { count: booksFinishedAll },
    { data: sessionRows },
    { data: memberships },
    friends,
    estantes,
    pedidos,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("username, display_name, created_at, avatar_url, avatar_zoom, avatar_bg, metrics_prefs")
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
      .eq("user_id", userId)
      .eq("status", "finished")
      .gte("finished_at", `${year}-01-01`)
      .lte("finished_at", `${year}-12-31`),
    supabase.from("media_items").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase
      .from("media_items")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "finished"),
    supabase
      .from("sessions")
      .select("started_at, duration_seconds, unit_start, unit_end")
      .eq("user_id", userId),
    supabase
      .from("group_members")
      .select("competes, groups!inner(id, name, emoji, format)")
      .eq("user_id", userId),
    getFriends(supabase, userId),
    getFriendsShelf(supabase, userId),
    getPedidosRecebidos(supabase, userId),
  ]);

  const totalFinished = finishedThisYear ?? 0;
  const annualTarget = annualGoal?.target_value ?? 0;

  const phase =
    annualTarget > 0
      ? quillPhase(Math.min(100, Math.round((totalFinished / annualTarget) * 100)))
      : null;

  const sessions = (sessionRows ?? []) as SessionRow[];
  const totalSeconds = sessions.reduce((acc, s) => acc + (s.duration_seconds ?? 0), 0);
  const totalHours = Math.round(totalSeconds / 3600);
  const recordeStreak = computeStreak(sessions).record;

  // Conquistas reais, calculadas a partir das sessões e da estante.
  const avaliadas = evaluateAchievements({
    sessionsCount: sessions.length,
    booksFinished: booksFinishedAll ?? 0,
    streakRecord: recordeStreak,
    maxSessionPages: computeMaxSessionPages(sessions),
  });

  const badges: BadgeView[] = avaliadas.map(({ achievement, progress, met }) => ({
    id: achievement.key,
    titulo: achievement.name,
    descricao: achievement.description,
    icone: ACHIEVEMENT_ICON[achievement.criteria.type],
    cor: BADGE_COR[achievement.tier] ?? "bg-mustard",
    desbloqueada: met,
    progresso: progress,
    alvo: achievement.criteria.target,
  }));

  type GroupRow = { id: string; name: string; emoji: string | null; format: string };
  const desafios: DesafioRanking[] = (memberships ?? [])
    .map((m) => {
      const g = m.groups as unknown as GroupRow | GroupRow[];
      const grupo = Array.isArray(g) ? g[0] : g;
      if (!grupo || grupo.format !== "challenge") return null;
      return {
        id: grupo.id,
        nome: grupo.name,
        emoji: grupo.emoji ?? "📚",
        competes: Boolean(m.competes),
      };
    })
    .filter(Boolean) as DesafioRanking[];

  const criadoEm = profile?.created_at ? new Date(profile.created_at) : null;
  const membroDesde = criadoEm
    ? `${MESES_CURTOS[criadoEm.getMonth()]}/${criadoEm.getFullYear()}`
    : null;

  return (
    <PerfilClient
      pilulas={pillsEscolhidas(profile?.metrics_prefs).map(rotuloDaPill)}
      displayName={profile?.display_name ?? null}
      username={profile?.username ?? null}
      avatarUrl={(profile?.avatar_url as string | null) ?? null}
      avatarZoom={(profile?.avatar_zoom as number | null) ?? 100}
      avatarBg={(profile?.avatar_bg as string | null) ?? "#6D6885"}
      updateAvatarAction={updateAvatar}
      membroDesde={membroDesde}
      totalLivros={totalBooks ?? 0}
      totalHoras={totalHours}
      recordeStreak={recordeStreak}
      amigos={friends}
      pedidos={pedidos}
      estantes={estantes}
      badges={badges}
      desafios={desafios}
      totalFinished={totalFinished}
      annualTarget={annualTarget}
      phaseLabel={phase?.label ?? null}
      phaseImg={phase?.img ?? null}
      logoutAction={logout}
      deleteAccountAction={deleteAccount}
      toggleCompeteAction={toggleCompete}
    />
  );
}
