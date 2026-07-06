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
const WEEKDAY_LABELS = ["S", "T", "Q", "Q", "S", "S", "D"]; // segunda-first

// Cores fixas por membro pros micro-pontos e pódio (você = coral, sempre).
const MEMBER_COLORS = [
  "var(--color-moss-dark)",
  "var(--color-navy)",
  "var(--color-mustard)",
  "var(--color-cover-4)",
  "var(--color-moss)",
];

function weekdayIndexMondayFirst(dateStr: string): number {
  const d = new Date(`${dateStr}T00:00:00Z`).getUTCDay();
  return d === 0 ? 6 : d - 1;
}

function formatRelative(iso: string): string {
  const diffMs = Date.now() - +new Date(iso);
  const diffH = Math.floor(diffMs / 3_600_000);
  if (diffH < 1) return "agora";
  if (diffH < 24) return `há ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return "ontem";
  return `há ${diffD} dias`;
}

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export default async function ChallengeDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ view?: string; y?: string; m?: string; quem?: string }>;
}) {
  const userId = await requireUserId();
  const { id } = await params;
  const { view, y, m, quem } = await searchParams;
  const monthView = view === "mes";

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

  const memberIds = (members ?? []).map((mb) => mb.user_id);
  const { data: profiles } = memberIds.length
    ? await supabase.from("profiles").select("id, display_name").in("id", memberIds)
    : { data: [] as { id: string; display_name: string | null }[] };
  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.display_name ?? "?"]));
  const myMembership = (members ?? []).find((mb) => mb.user_id === userId);

  // você = coral; os demais ciclam a paleta na ordem dos membros
  const colorById = new Map<string, string>();
  let colorIdx = 0;
  for (const mid of memberIds) {
    colorById.set(
      mid,
      mid === userId ? "var(--color-coral)" : MEMBER_COLORS[colorIdx++ % MEMBER_COLORS.length],
    );
  }

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
    .filter((mb) => mb.competes)
    .map((mb) => ({ userId: mb.user_id, score: scores.get(mb.user_id) ?? 0 }))
    .sort((a, b) => b.score - a.score);
  const optedOut = (members ?? []).filter((mb) => !mb.competes);

  const checkinDaysByUser = new Map<string, Set<string>>();
  for (const c of checkinRows) {
    if (!c.session) continue;
    const day = c.session.started_at.slice(0, 10);
    if (!checkinDaysByUser.has(c.user_id)) checkinDaysByUser.set(c.user_id, new Set());
    checkinDaysByUser.get(c.user_id)!.add(day);
  }

  const remaining = daysRemaining(group.ends_at);
  const unit = SCORING_METRIC_UNIT[group.scoring_metric as ScoringMetric];
  const displayName = (uid: string) =>
    uid === userId ? "Você" : (nameById.get(uid) ?? "?");

  // ---------- VISÃO DO MÊS ----------
  if (monthView) {
    const now = new Date();
    const year = Number(y) || now.getFullYear();
    const month = Number(m) || now.getMonth() + 1; // 1-12
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const firstOffset = weekdayIndexMondayFirst(
      `${year}-${String(month).padStart(2, "0")}-01`,
    );
    const prev = month === 1 ? { y: year - 1, m: 12 } : { y: year, m: month - 1 };
    const next = month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 };
    const todayStr = now.toISOString().slice(0, 10);
    const filtered = quem && memberIds.includes(quem) ? quem : null;

    const cells: (string | null)[] = [
      ...Array.from({ length: firstOffset }, () => null),
      ...Array.from({ length: daysInMonth }, (_, i) =>
        `${year}-${String(month).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`,
      ),
    ];

    return (
      <>
        <header className="flex items-center justify-between border-b-2 border-ink bg-white px-4 py-3">
          <Link href={`/juntos/${id}`} className="text-sm font-medium">
            ‹ Desafio
          </Link>
          <span className="font-serif text-base font-semibold">Check-ins do mês</span>
          <span className="w-14" />
        </header>
        <main className="mx-auto w-full max-w-sm flex-1 px-4 py-5">
          <div className="mb-3 flex items-center justify-between">
            <Link
              href={`/juntos/${id}?view=mes&y=${prev.y}&m=${prev.m}${filtered ? `&quem=${filtered}` : ""}`}
              className="px-2 text-lg font-semibold text-ink/60"
              aria-label="Mês anterior"
            >
              ‹
            </Link>
            <h2 className="font-serif text-lg font-semibold">
              {MONTH_NAMES[month - 1]} {year}
            </h2>
            <Link
              href={`/juntos/${id}?view=mes&y=${next.y}&m=${next.m}${filtered ? `&quem=${filtered}` : ""}`}
              className="px-2 text-lg font-semibold text-ink/60"
              aria-label="Próximo mês"
            >
              ›
            </Link>
          </div>

          <div className="mb-4 flex flex-wrap gap-1.5">
            <Link
              href={`/juntos/${id}?view=mes&y=${year}&m=${month}`}
              className={`rounded-full border-2 px-2.5 py-1 text-[11px] font-semibold ${
                !filtered ? "border-ink bg-mustard shadow-hard-sm" : "border-cover-border bg-white"
              }`}
            >
              Todos
            </Link>
            {memberIds.map((mid) => (
              <Link
                key={mid}
                href={`/juntos/${id}?view=mes&y=${year}&m=${month}&quem=${mid}`}
                className={`flex items-center gap-1.5 rounded-full border-2 px-2.5 py-1 text-[11px] font-semibold ${
                  filtered === mid
                    ? "border-ink bg-mustard shadow-hard-sm"
                    : "border-cover-border bg-white"
                }`}
              >
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ background: colorById.get(mid) }}
                />
                {displayName(mid)}
              </Link>
            ))}
          </div>

          <div className="rounded-md border-2 border-cover-border bg-white p-3">
            <div className="mb-1.5 grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-ink/60">
              {WEEKDAY_LABELS.map((l, i) => (
                <span key={i}>{l}</span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {cells.map((day, i) =>
                day === null ? (
                  <span key={`v-${i}`} />
                ) : (
                  <div
                    key={day}
                    className={`relative aspect-square rounded border border-cover-border bg-paper p-0.5 ${
                      day === todayStr ? "outline-2 outline-coral" : ""
                    }`}
                  >
                    <span className="text-[8.5px] font-semibold text-ink/55">
                      {Number(day.slice(8))}
                    </span>
                    <span className="absolute inset-x-0.5 bottom-0.5 flex flex-wrap justify-center gap-[2px]">
                      {memberIds
                        .filter((mid) => (!filtered || mid === filtered))
                        .filter((mid) => checkinDaysByUser.get(mid)?.has(day))
                        .map((mid) => (
                          <span
                            key={mid}
                            className="h-[6px] w-[6px] rounded-full"
                            style={{ background: colorById.get(mid) }}
                          />
                        ))}
                    </span>
                  </div>
                ),
              )}
            </div>
          </div>
          <p className="mt-2 text-[11px] text-ink/60">
            Cada ponto = um membro com check-in no dia. Filtre por pessoa nos chips acima.
          </p>
        </main>
      </>
    );
  }

  // ---------- PÁGINA ÚNICA: ranking → semana → feed ----------
  const today = new Date();
  const last7 = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });

  const podium = ranked.slice(0, 3);
  const rest = ranked.slice(3);
  // ordem visual do pódio: 2º · 1º · 3º
  const podiumOrder = [podium[1], podium[0], podium[2]].filter(Boolean) as typeof podium;
  const podiumHeights: Record<number, string> = { 0: "h-20", 1: "h-14", 2: "h-11" };

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
        <p className="mb-4 text-[11.5px] text-ink/65">
          pontua por {unit} · código {group.invite_code} · {members?.length ?? 0} participantes
        </p>

        {/* 1. RANKING — sempre primeiro */}
        <section className="mb-4 rounded-md border-2 border-navy bg-white p-4">
          <h2 className="font-serif text-base font-semibold">Ranking</h2>
          {podium.length > 0 ? (
            <>
              <div className="mt-3 flex items-end justify-center gap-2.5">
                {podiumOrder.map((r) => {
                  const pos = ranked.indexOf(r);
                  return (
                    <div key={r.userId} className="flex-1 text-center">
                      <div
                        className="mx-auto mb-1.5 flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-paper"
                        style={{ background: colorById.get(r.userId) }}
                      >
                        {nameById.get(r.userId)?.[0]?.toUpperCase() ?? "?"}
                      </div>
                      <div
                        className={`flex ${podiumHeights[pos]} items-start justify-center rounded-t-md border-2 border-ink pt-1 font-display text-sm text-paper`}
                        style={{ background: colorById.get(r.userId) }}
                      >
                        {pos + 1}º
                      </div>
                      <p className="mt-1 text-[10.5px] font-semibold text-ink/70">
                        {displayName(r.userId)} · {r.score} {unit}
                      </p>
                    </div>
                  );
                })}
              </div>
              {rest.length > 0 && (
                <div className="mt-2 flex flex-col gap-1 border-t border-dashed border-cover-border pt-2">
                  {rest.map((r, i) => (
                    <p
                      key={r.userId}
                      className={`text-xs font-semibold ${r.userId === userId ? "text-coral" : ""}`}
                    >
                      {i + 4}º {displayName(r.userId)} · {r.score} {unit}
                    </p>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="mt-2 text-sm text-ink/65">Ninguém no ranking ainda.</p>
          )}
          <div className="mt-2.5 flex items-center justify-between border-t border-dashed border-cover-border pt-2">
            {optedOut.length > 0 ? (
              <span className="text-[10.5px] text-ink/60">
                fora do ranking: {optedOut.map((mb) => displayName(mb.user_id)).join(", ")}
              </span>
            ) : (
              <span />
            )}
            {myMembership && (
              <form action={toggleCompete.bind(null, id, !myMembership.competes)}>
                <button type="submit" className="text-[10.5px] text-ink/60 underline">
                  {myMembership.competes ? "sair do ranking" : "entrar no ranking"}
                </button>
              </form>
            )}
          </div>
        </section>

        {/* 2. FAIXA DA SEMANA */}
        <section className="mb-5 rounded-md border-2 border-cover-border bg-white p-4">
          <div className="flex items-baseline justify-between">
            <h2 className="font-serif text-base font-semibold">Esta semana</h2>
            <Link
              href={`/juntos/${id}?view=mes`}
              className="text-[11px] font-semibold text-ink/60"
            >
              ver mês ›
            </Link>
          </div>
          <div className="mt-2.5 grid grid-cols-7 gap-1.5 text-center">
            {last7.map((day) => (
              <span key={`h-${day}`} className="text-[10px] font-semibold text-ink/60">
                {WEEKDAY_LABELS[weekdayIndexMondayFirst(day)]}
              </span>
            ))}
            {last7.map((day) => (
              <div
                key={day}
                className="flex min-h-8 flex-wrap items-center justify-center gap-[2px] rounded border border-cover-border bg-paper p-0.5"
              >
                {memberIds
                  .filter((mid) => checkinDaysByUser.get(mid)?.has(day))
                  .map((mid) => (
                    <span
                      key={mid}
                      className="h-[7px] w-[7px] rounded-full"
                      style={{ background: colorById.get(mid) }}
                    />
                  ))}
              </div>
            ))}
          </div>
          <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1">
            {memberIds.map((mid) => (
              <span
                key={mid}
                className="flex items-center gap-1 text-[10.5px] font-semibold text-ink/70"
              >
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ background: colorById.get(mid) }}
                />
                {displayName(mid)}
              </span>
            ))}
          </div>
        </section>

        {/* 3. FEED */}
        <h2 className="mb-3 font-serif text-base font-semibold">Atividade</h2>
        <div className="flex flex-col gap-4">
          {checkinRows.map((c) => {
            const mediaItem = Array.isArray(c.session?.media_item)
              ? c.session?.media_item[0]
              : c.session?.media_item;
            const pages =
              c.session?.unit_start != null && c.session?.unit_end != null
                ? Math.max(0, c.session.unit_end - c.session.unit_start)
                : null;
            const chapters =
              c.session?.chapter_start != null && c.session?.chapter_end != null
                ? Math.max(0, c.session.chapter_end - c.session.chapter_start)
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
                    style={{ background: colorById.get(c.user_id) ?? "var(--color-moss-dark)" }}
                  >
                    {nameById.get(c.user_id)?.[0]?.toUpperCase() ?? "?"}
                  </div>
                  <div
                    className={`flex-1 rounded-md border-2 px-3 py-2 ${
                      isMe ? "border-coral" : "border-cover-border"
                    }`}
                  >
                    <div className="text-xs">
                      <span className="font-semibold">{displayName(c.user_id)}</span>{" "}
                      <span className="text-ink/55">· {formatRelative(c.created_at)}</span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {c.session && (
                        <span className="rounded border border-cover-border bg-[#fdf3dd] px-1.5 py-0.5 text-[10.5px] font-semibold">
                          ⏱ {formatDuration(c.session.duration_seconds ?? 0)}
                        </span>
                      )}
                      {chapters !== null && chapters > 0 && (
                        <span className="rounded border border-cover-border bg-[#fdf3dd] px-1.5 py-0.5 text-[10.5px] font-semibold">
                          📖 {chapters} cap
                        </span>
                      )}
                      {pages !== null && pages > 0 && (
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
                        <span className="font-semibold">{displayName(r.user_id)}:</span>{" "}
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
              Nenhum registro ainda — feche uma sessão de leitura e publique aqui.
            </p>
          )}
        </div>
      </main>
    </>
  );
}
