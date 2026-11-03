import { createClient } from "@/lib/supabase/server";
import { getNotificacoes } from "@/lib/notificacoes";
import { pillsEscolhidas, rotuloDaPill } from "@/lib/pills";
import { requireUserId } from "@/lib/supabase/auth";
import { updateAvatar } from "@/app/actions/profile";
import { logout, deleteAccount } from "@/app/actions/auth";
import { toggleCompete } from "@/app/actions/groups";
import { quillPhase } from "@/lib/gamification";
import { evaluateAchievements } from "@/lib/achievements";
import { anoAtual, loadAchievementData } from "@/lib/achievement-context";
import { listarAvataresEnviados } from "@/lib/artes";
import {
  SRCS_AVATAR_DE_CONQUISTA,
  srcDoAvatarDeConquista,
  type AvatarDeConquista,
} from "@/lib/avatares";
import { getFriends, getFriendsShelf, getPedidosRecebidos } from "@/lib/friends";
import { PerfilClient, type DesafioRanking } from "./perfil-client";

const MESES_CURTOS = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

export default async function ProfilePage() {
  const userId = await requireUserId();

  const supabase = await createClient();
  const year = anoAtual();

  const [
    { data: profile },
    { data: annualGoal },
    { count: finishedThisYear },
    { count: totalBooks },
    conquistas,
    { data: memberships },
    friends,
    estantes,
    pedidos,
    notificacoes,
    avataresExtras,
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
    loadAchievementData(supabase, userId),
    supabase
      .from("group_members")
      .select("competes, groups!inner(id, name, format)")
      .eq("user_id", userId),
    getFriends(supabase, userId),
    getFriendsShelf(supabase, userId),
    getPedidosRecebidos(supabase, userId),
    getNotificacoes(supabase, userId),
    listarAvataresEnviados(supabase),
  ]);

  const totalFinished = finishedThisYear ?? 0;
  const annualTarget = annualGoal?.target_value ?? 0;

  const phase =
    annualTarget > 0
      ? quillPhase(Math.min(100, Math.round((totalFinished / annualTarget) * 100)))
      : null;

  const { ctx: ctxConquistas, sessions } = conquistas;
  const totalSeconds = sessions.reduce((acc, s) => acc + (s.duration_seconds ?? 0), 0);
  const totalHours = Math.round(totalSeconds / 3600);
  const recordeStreak = ctxConquistas.streakRecord;

  // Conquistas reais, calculadas a partir das sessões e da estante.
  const avaliadas = evaluateAchievements(ctxConquistas);

  // Fotos de conquista: liberadas pra quem fez a conquista — e pra quem já
  // usava a foto antes dela virar prêmio.
  const avatarUrl = (profile?.avatar_url as string | null) ?? null;
  const avataresConquista: AvatarDeConquista[] = avaliadas
    .filter(({ achievement }) => achievement.avatar)
    .map(({ achievement, met }) => {
      const src = srcDoAvatarDeConquista(achievement.avatar!.arquivo);
      return {
        src,
        nome: achievement.avatar!.nome,
        dica: achievement.avatar!.dica,
        liberado: met || avatarUrl === src,
      };
    });
  const avataresGerais = avataresExtras.filter((src) => !SRCS_AVATAR_DE_CONQUISTA.includes(src));

  type GroupRow = { id: string; name: string; format: string };
  const desafios: DesafioRanking[] = (memberships ?? [])
    .map((m) => {
      const g = m.groups as unknown as GroupRow | GroupRow[];
      const grupo = Array.isArray(g) ? g[0] : g;
      if (!grupo || grupo.format !== "challenge") return null;
      return {
        id: grupo.id,
        nome: grupo.name,
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
      avatarUrl={avatarUrl}
      avatarZoom={(profile?.avatar_zoom as number | null) ?? 100}
      avatarBg={(profile?.avatar_bg as string | null) ?? "#6D6885"}
      avataresExtras={avataresGerais}
      avataresConquista={avataresConquista}
      updateAvatarAction={updateAvatar}
      membroDesde={membroDesde}
      totalLivros={totalBooks ?? 0}
      totalHoras={totalHours}
      recordeStreak={recordeStreak}
      amigos={friends}
      pedidos={pedidos}
      notificacoes={notificacoes.novas}
      estantes={estantes}
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
