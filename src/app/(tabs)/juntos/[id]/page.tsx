import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/supabase/auth";
import { getHighlightSignedUrl } from "@/lib/highlights";
import { toggleReaction, replyToCheckin } from "@/app/actions/checkins";
import { toggleCompete } from "@/app/actions/groups";
import {
  computeScores,
  daysRemaining,
  SCORING_METRIC_UNIT,
  type ScoringMetric,
} from "@/lib/challenges";
import { formatDuration } from "@/lib/reading-stats";

const REACTIONS = ["🔥", "👏", "☕", "😮"];
const WEEKDAY_LABELS = ["S", "T", "Q", "Q", "S", "S", "D"];

function formatRelative(iso: string): string {
  const diffMs = Date.now() - +new Date(iso);
  const diffH = Math.floor(diffMs / 3_600_000);
  if (diffH < 1) return "agora";
  if (diffH < 24) return `há ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return "ontem";
  return `há ${diffD} dias`;
}

export default async function ChallengeDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const userId = await requireUserId();
  const { id } = await params;
  const { view: viewParam } = await searchParams;
  const view = ["feed", "ranking", "calendario"].includes(viewParam ?? "")
    ? (viewParam as string)
    : "feed";

  const supabase = await createClient();

  const { data: group } = await supabase
    .from("groups")
    .select("id, name, emoji, description, scoring_metric, starts_at, ends_at, invite_code")
    .eq("id", id)
    .single();

  if (!group) notFound();

  const [{ data: members }, { data: checkins }] = await Promise.all([
    supabase.from("group_members").select("user_id, competes").eq("group_id", id),
    supabase
      .from("challenge_checkins")
      .select(
        "id, user_id, note, photo_path, created_at, session:sessions(started_at, duration_seconds, unit_start, unit_end, chapter_start, chapter_end, item_id, media_item:media_items(title))",
      )
      .eq("group_id", id)
      .order("created_at", { ascending: false }),
  ]);

  const memberIds = (members ?? []).map((m) => m.user_id);
  const { data: profiles } = memberIds.length
    ? await supabase.from("profiles").select("id, display_name").in("id", memberIds)
    : { data: [] as { id: string; display_name: string | null }[] };
  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.display_name ?? "?"]));
  const myMembership = (members ?? []).find((m) => m.user_id === userId);

  type CheckinRow = {
    id: string;
    user_id: string;
    note: string | null;
    photo_path: string | null;
    created_at: string;
    session: {
      started_at: string;
      duration_seconds: number | null;
      unit_start: number | null;
      unit_end: number | null;
      chapter_start: number | null;
      chapter_end: number | null;
      item_id: string | null;
      media_item: { title: string } | { title: string }[] | null;
    } | null;
  };
  const checkinRows = (checkins ?? []) as unknown as CheckinRow[];

  const checkinIds = checkinRows.map((c) => c.id);
  const { data: comments } = checkinIds.length
    ? await supabase
        .from("comments")
        .select("id, checkin_id, user_id, content, created_at")
        .in("checkin_id", checkinIds)
    : { data: [] as { id: string; checkin_id: string; user_id: string; content: string | null; created_at: string }[] };

  const photoUrls = new Map<string, string | null>();
  for (const c of checkinRows) {
    if (c.photo_path) {
      photoUrls.set(c.id, await getHighlightSignedUrl(supabase, c.photo_path));
    }
  }

  const scores = computeScores(
    checkinRows.map((c) => ({ user_id: c.user_id, session: c.session })),
    group.scoring_metric as ScoringMetric,
  );
  const ranked = (members ?? [])
    .filter((m) => m.competes)
    .map((m) => ({ userId: m.user_id, score: scores.get(m.user_id) ?? 0 }))
    .sort((a, b) => b.score - a.score);
  const maxScore = ranked[0]?.score || 1;

  const today = new Date();
  const last7 = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });
  const checkinDaysByUser = new Map<string, Set<string>>();
  for (const c of checkinRows) {
    if (!c.session) continue;
    const day = c.session.started_at.slice(0, 10);
    if (!checkinDaysByUser.has(c.user_id)) checkinDaysByUser.set(c.user_id, new Set());
    checkinDaysByUser.get(c.user_id)!.add(day);
  }

  const remaining = daysRemaining(group.ends_at);
  const unit = SCORING_METRIC_UNIT[group.scoring_metric as ScoringMetric];

  return (
    <>
      <header className="flex items-center justify-between border-b-2 border-ink bg-white px-4 py-3">
        <Link href="/juntos" className="text-sm font-medium">
          ‹ Juntos
        </Link>
        {remaining !== null && (
          <span className="rounded-full border-2 border-ink px-2 py-0.5 text-[10px] font-medium">
            {remaining} dias restantes
          </span>
        )}
      </header>
      <main className="mx-auto w-full max-w-sm flex-1 px-4 py-5">
        <h1 className="font-serif text-xl font-semibold">
          {group.emoji} {group.name}
        </h1>
        <p className="mb-3 text-[11.5px] text-ink/65">
          pontua por {unit} · código {group.invite_code} · {members?.length ?? 0} participantes
        </p>

        <div className="mb-4 flex overflow-hidden rounded-md border-2 border-ink text-xs font-medium">
          {(["feed", "ranking", "calendario"] as const).map((v) => (
            <Link
              key={v}
              href={`/juntos/${id}?view=${v}`}
              className={`flex-1 border-r-2 border-ink py-1.5 text-center last:border-r-0 ${
                view === v ? "bg-moss-dark text-paper" : "bg-white text-ink"
              }`}
            >
              {v === "feed" ? "Feed" : v === "ranking" ? "Ranking" : "Calendário"}
            </Link>
          ))}
        </div>

        {view === "feed" && (
          <div className="flex flex-col gap-4">
            {checkinRows.map((c) => {
              const mediaItem = Array.isArray(c.session?.media_item)
                ? c.session?.media_item[0]
                : c.session?.media_item;
              const pages =
                c.session?.unit_start != null && c.session?.unit_end != null
                  ? Math.max(0, c.session.unit_end - c.session.unit_start)
                  : null;
              const checkinComments = (comments ?? []).filter((cm) => cm.checkin_id === c.id);
              const reactionCounts = new Map<string, number>();
              let myReaction: string | null = null;
              const replies: typeof checkinComments = [];
              for (const cm of checkinComments) {
                if (REACTIONS.includes(cm.content ?? "")) {
                  reactionCounts.set(cm.content!, (reactionCounts.get(cm.content!) ?? 0) + 1);
                  if (cm.user_id === userId) myReaction = cm.content;
                } else {
                  replies.push(cm);
                }
              }
              const isMe = c.user_id === userId;

              return (
                <div key={c.id}>
                  <div className="flex gap-2.5">
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-paper"
                      style={{ background: isMe ? "var(--color-coral)" : "var(--color-moss-dark)" }}
                    >
                      {nameById.get(c.user_id)?.[0]?.toUpperCase() ?? "?"}
                    </div>
                    <div
                      className={`flex-1 rounded-md border-2 px-3 py-2 ${
                        isMe ? "border-coral" : "border-cover-border"
                      }`}
                    >
                      <div className="text-xs">
                        <span className="font-semibold">
                          {isMe ? "Você" : nameById.get(c.user_id)}
                        </span>{" "}
                        <span className="text-ink/55">
                          · {formatRelative(c.created_at)}
                          {isMe && " · registro"}
                        </span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {c.session && (
                          <span className="rounded border border-cover-border bg-[#fdf3dd] px-1.5 py-0.5 text-[10.5px] font-semibold">
                            ⏱ {formatDuration(c.session.duration_seconds ?? 0)}
                          </span>
                        )}
                        {pages !== null && (
                          <span className="rounded border border-cover-border bg-[#fdf3dd] px-1.5 py-0.5 text-[10.5px] font-semibold">
                            📖 {pages} pág
                          </span>
                        )}
                        {mediaItem && (
                          <span className="rounded border border-cover-border bg-[#fdf3dd] px-1.5 py-0.5 text-[10.5px] font-semibold">
                            {mediaItem.title}
                          </span>
                        )}
                      </div>
                      {c.note && <p className="mt-1.5 text-[12.5px]">{c.note}</p>}
                      {photoUrls.get(c.id) && (
                        // eslint-disable-next-line @next/next/no-img-element -- URL assinada temporária
                        <img
                          src={photoUrls.get(c.id)!}
                          alt="Foto do check-in"
                          className="mt-2 h-24 w-full rounded object-cover"
                        />
                      )}
                    </div>
                  </div>

                  <div className="ml-[42px] mt-1.5 flex flex-wrap gap-1.5">
                    {REACTIONS.map((emoji) => {
                      const count = reactionCounts.get(emoji) ?? 0;
                      const on = myReaction === emoji;
                      return (
                        <form key={emoji} action={toggleReaction}>
                          <input type="hidden" name="checkin_id" value={c.id} />
                          <input type="hidden" name="group_id" value={id} />
                          <input type="hidden" name="emoji" value={emoji} />
                          <button
                            type="submit"
                            className={`rounded-full border-2 px-2 py-0.5 text-[11px] font-semibold ${
                              on
                                ? "border-ink bg-mustard shadow-hard-sm"
                                : "border-cover-border bg-white"
                            }`}
                          >
                            {emoji} {count > 0 ? count : ""}
                          </button>
                        </form>
                      );
                    })}
                  </div>

                  {replies.length > 0 && (
                    <div className="ml-[42px] mt-1.5 flex flex-col gap-1">
                      {replies.map((r) => (
                        <p key={r.id} className="text-[11.5px]">
                          <span className="font-semibold">
                            {nameById.get(r.user_id) ?? "?"}:
                          </span>{" "}
                          {r.content}
                        </p>
                      ))}
                    </div>
                  )}

                  <form action={replyToCheckin} className="ml-[42px] mt-1.5 flex gap-1.5">
                    <input type="hidden" name="checkin_id" value={c.id} />
                    <input type="hidden" name="group_id" value={id} />
                    <input
                      name="content"
                      placeholder="responder..."
                      className="flex-1 rounded border-2 border-cover-border bg-white px-2 py-1 text-[11.5px] focus:outline-none focus:ring-2 focus:ring-moss-dark"
                    />
                    <button
                      type="submit"
                      className="rounded border-2 border-ink bg-white px-2 text-[11.5px] font-medium"
                    >
                      ›
                    </button>
                  </form>
                </div>
              );
            })}
            {checkinRows.length === 0 && (
              <p className="text-sm text-ink/65">
                Nenhum check-in ainda — publique um no fim de uma sessão de leitura.
              </p>
            )}
          </div>
        )}

        {view === "ranking" && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              {ranked.map((r, i) => (
                <div
                  key={r.userId}
                  className={`flex items-center gap-2 rounded-md px-2 py-2 ${
                    r.userId === userId ? "bg-[#fdf3dd]" : ""
                  }`}
                >
                  <span className="w-6 text-center text-sm">
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}º`}
                  </span>
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-moss-dark text-[10px] font-semibold text-paper">
                    {nameById.get(r.userId)?.[0]?.toUpperCase() ?? "?"}
                  </div>
                  <span className="w-16 truncate text-xs font-semibold">
                    {r.userId === userId ? "Você" : nameById.get(r.userId)}
                  </span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full border border-cover-border bg-white">
                    <div
                      className="h-full bg-coral"
                      style={{ width: `${Math.round((r.score / maxScore) * 100)}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-semibold">
                    {r.score} {unit}
                  </span>
                </div>
              ))}
              {ranked.length === 0 && (
                <p className="text-sm text-ink/65">Ninguém no ranking ainda.</p>
              )}
            </div>

            {myMembership && (
              <form action={toggleCompete.bind(null, id, !myMembership.competes)}>
                <button
                  type="submit"
                  className="text-xs text-ink/60 underline"
                >
                  {myMembership.competes ? "Sair do ranking" : "Entrar no ranking"}
                </button>
              </form>
            )}
          </div>
        )}

        {view === "calendario" && (
          <div className="overflow-x-auto">
            <table className="w-full text-center text-xs">
              <thead>
                <tr>
                  <th className="text-left font-medium"> </th>
                  {last7.map((day) => (
                    <th key={day} className="font-medium text-ink/60">
                      {WEEKDAY_LABELS[new Date(`${day}T00:00:00Z`).getUTCDay() === 0 ? 6 : new Date(`${day}T00:00:00Z`).getUTCDay() - 1]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(members ?? []).map((m) => (
                  <tr key={m.user_id}>
                    <td className="py-1 text-left font-semibold">
                      {m.user_id === userId ? "Você" : nameById.get(m.user_id)}
                    </td>
                    {last7.map((day) => (
                      <td key={day}>
                        <span
                          className={`inline-block h-2.5 w-2.5 rounded-full border border-cover-border ${
                            checkinDaysByUser.get(m.user_id)?.has(day) ? "bg-moss-dark" : "bg-white"
                          }`}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  );
}
