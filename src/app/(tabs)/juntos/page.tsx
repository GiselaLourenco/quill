import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/supabase/auth";
import { joinChallengeByCode } from "@/app/actions/groups";
import { computeScores, daysRemaining, periodProgress } from "@/lib/challenges";

type GroupRow = {
  id: string;
  name: string;
  emoji: string | null;
  scoring_metric: string;
  starts_at: string | null;
  ends_at: string | null;
};

export default async function JuntosPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const userId = await requireUserId();
  const { error } = await searchParams;
  const supabase = await createClient();

  const { data: memberships } = await supabase
    .from("group_members")
    .select(
      "group_id, groups!inner(id, name, emoji, format, scoring_metric, starts_at, ends_at)",
    )
    .eq("user_id", userId);

  const challenges = (memberships ?? [])
    .map((m) => m.groups as unknown as GroupRow & { format: string })
    .filter((g) => g && g.format === "challenge");

  const today = new Date().toISOString().slice(0, 10);
  const active = challenges.filter((g) => !g.ends_at || g.ends_at >= today);
  const ended = challenges.filter((g) => g.ends_at && g.ends_at < today);

  const challengeCards = await Promise.all(
    active.map(async (g) => {
      const [{ data: members }, { data: checkins }] = await Promise.all([
        supabase
          .from("group_members")
          .select("user_id, competes")
          .eq("group_id", g.id),
        supabase
          .from("challenge_checkins")
          .select(
            "user_id, session:sessions(started_at, duration_seconds, unit_start, unit_end, chapter_start, chapter_end)",
          )
          .eq("group_id", g.id),
      ]);

      const memberIds = (members ?? []).map((m) => m.user_id);
      const { data: profiles } = memberIds.length
        ? await supabase
            .from("profiles")
            .select("id, display_name")
            .in("id", memberIds)
        : { data: [] as { id: string; display_name: string | null }[] };
      const nameById = new Map((profiles ?? []).map((p) => [p.id, p.display_name]));

      const scores = computeScores(
        (checkins ?? []).map((c) => ({
          user_id: c.user_id,
          session: Array.isArray(c.session) ? c.session[0] ?? null : c.session,
        })),
        g.scoring_metric as never,
      );

      const ranked = (members ?? [])
        .filter((m) => m.competes)
        .map((m) => ({ userId: m.user_id, score: scores.get(m.user_id) ?? 0 }))
        .sort((a, b) => b.score - a.score);
      const myRank = ranked.findIndex((r) => r.userId === userId) + 1;

      const membersWithNames = (members ?? []).map((m) => ({
        ...m,
        display_name: nameById.get(m.user_id) ?? null,
      }));

      return { group: g, members: membersWithNames, myRank: myRank || null };
    }),
  );

  return (
    <>
      <header className="flex items-center justify-between border-b-2 border-ink bg-white px-4 py-3">
        <span className="font-serif text-lg">Juntos</span>
        <Link
          href="/juntos/novo"
          className="rounded border-2 border-ink bg-navy px-3 py-1.5 text-xs font-medium text-paper"
        >
          + Criar desafio
        </Link>
      </header>
      <main className="mx-auto w-full max-w-sm flex-1 px-4 py-6">
        {error && <p className="mb-4 text-sm font-medium text-coral">{error}</p>}

        <div className="flex flex-col gap-3">
          {challengeCards.map(({ group, members, myRank }) => {
            const remaining = daysRemaining(group.ends_at);
            const progress = periodProgress(group.starts_at, group.ends_at);
            return (
              <Link
                key={group.id}
                href={`/juntos/${group.id}`}
                className="block rounded-md border-2 border-navy px-3 py-3 shadow-hard-sm"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-serif text-base font-semibold">
                    {group.emoji} {group.name}
                  </h3>
                  {remaining !== null && (
                    <span className="rounded-full border-2 border-ink px-2 py-0.5 text-[10px] font-medium">
                      {remaining} dias restantes
                    </span>
                  )}
                </div>
                <div className="my-2 h-1.5 overflow-hidden rounded-full border border-cover-border bg-white">
                  <div
                    className="h-full bg-mustard"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex">
                    {members.slice(0, 5).map((m, i) => (
                      <div
                        key={m.user_id}
                        className="-ml-2 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-coral text-[10px] font-semibold text-paper first:ml-0"
                        style={{ zIndex: 5 - i }}
                      >
                        {m.display_name?.[0]?.toUpperCase() ?? "?"}
                      </div>
                    ))}
                  </div>
                  {myRank && (
                    <span className="text-xs font-bold text-navy">
                      Você está em {myRank}º ›
                    </span>
                  )}
                </div>
              </Link>
            );
          })}

          {ended.map((g) => (
            <div key={g.id} className="rounded-md border-2 border-cover-border px-3 py-3 opacity-75">
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-base font-semibold">
                  {g.emoji} {g.name}
                </h3>
                <span className="text-[10.5px] text-ink/60">encerrado</span>
              </div>
              <Link href={`/juntos/${g.id}`} className="mt-1.5 block text-xs text-moss-dark">
                ver detalhes ›
              </Link>
            </div>
          ))}

          {challenges.length === 0 && (
            <p className="text-sm text-ink/65">
              Você ainda não participa de nenhum desafio.
            </p>
          )}
        </div>

        <form
          action={joinChallengeByCode}
          className="mt-4 rounded-md border-2 border-cover-border bg-white/60 px-3 py-3"
        >
          <h3 className="mb-2 font-serif text-sm font-semibold">Tem um convite?</h3>
          <div className="flex gap-2">
            <input
              name="code"
              placeholder="CÓDIGO"
              className="flex-1 rounded border-2 border-ink bg-white px-3 py-2 text-sm uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-moss-dark"
            />
            <button
              type="submit"
              className="rounded border-2 border-ink bg-moss-dark px-4 text-sm font-medium text-paper"
            >
              Entrar
            </button>
          </div>
        </form>
      </main>
    </>
  );
}
