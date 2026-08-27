import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/supabase/auth";
import { joinChallengeByCode } from "@/app/actions/groups";
import { computeScores, daysRemaining, periodProgress } from "@/lib/challenges";
import { BookCoverLovable } from "@/components/book-cover-lovable";
import {
  desafiosAtivos,
  desafiosEncerrados,
  type Desafio,
  type MembroDesafio,
} from "@/lib/mock-desafios";

type GroupRow = {
  id: string;
  name: string;
  emoji: string | null;
  scoring_metric: string;
  starts_at: string | null;
  ends_at: string | null;
};

/* ---------- helpers ---------- */

const SOMBRA: Record<Desafio["acentoSombra"], string> = {
  navy: "shadow-[6px_6px_0_0_var(--color-navy)]",
  moss: "shadow-[6px_6px_0_0_var(--color-moss)]",
  mustard: "shadow-[6px_6px_0_0_var(--color-mustard)]",
  coral: "shadow-[6px_6px_0_0_var(--color-coral)]",
};

const SOMBRA_CAPA: Record<Desafio["acentoCapa"], string> = {
  mustard: "shadow-[4px_4px_0_0_var(--color-mustard)]",
  navy: "shadow-[4px_4px_0_0_var(--color-navy)]",
  coral: "shadow-[4px_4px_0_0_var(--color-coral)]",
  moss: "shadow-[4px_4px_0_0_var(--color-moss)]",
};

const BARRA_FILL: Record<Desafio["acentoBarra"], string> = {
  moss: "bg-moss",
  coral: "bg-coral",
  mustard: "bg-mustard",
  navy: "bg-navy",
};

const BARRA_TEXTO: Record<Desafio["acentoBarra"], string> = {
  moss: "text-moss",
  coral: "text-coral",
  mustard: "text-mustard",
  navy: "text-navy",
};

const MEMBRO_BG: Record<MembroDesafio["cor"], string> = {
  coral: "bg-coral text-paper",
  moss: "bg-moss text-paper",
  mustard: "bg-mustard text-ink",
  navy: "bg-navy text-paper",
  "cover-1": "bg-cover-1 text-ink",
  "cover-2": "bg-cover-2 text-ink",
  "cover-3": "bg-cover-3 text-ink",
  "cover-4": "bg-cover-4 text-paper",
};

/* ---------- card ---------- */

function DesafioCard({ desafio }: { desafio: Desafio }) {
  const progresso =
    desafio.diasTotais === 0
      ? 0
      : Math.min(100, Math.round((desafio.diasDecorridos / desafio.diasTotais) * 100));
  const diasRestantes = Math.max(0, desafio.diasTotais - desafio.diasDecorridos);

  return (
    <article className={`relative border-2 border-ink bg-paper ${SOMBRA[desafio.acentoSombra]}`}>
      {desafio.destaqueTexto && (
        <span className="absolute -top-3 -right-2 rotate-2 border-2 border-ink bg-coral px-3 py-1 font-display text-[10px] uppercase tracking-wider text-paper">
          {desafio.destaqueTexto}
        </span>
      )}

      <div className="flex gap-4 p-4">
        {desafio.livro && (
          <div className={SOMBRA_CAPA[desafio.acentoCapa]}>
            <BookCoverLovable livro={desafio.livro} size="md" />
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
          <div>
            <h3 className="font-serif text-[19px] font-black italic leading-tight text-ink">
              {desafio.emoji} {desafio.nome}
            </h3>
            <p className="mt-1 font-display text-[9px] uppercase tracking-widest text-ink/60">
              {desafio.clube}
            </p>

            <div className="mt-3 flex -space-x-2">
              {desafio.membros.map((m) => (
                <span
                  key={m.id}
                  className={`flex h-7 w-7 items-center justify-center rounded-full border-2 border-ink text-[10px] font-black ${MEMBRO_BG[m.cor]}`}
                >
                  {m.inicial}
                </span>
              ))}
            </div>
          </div>

          {desafio.cta === "participar" ? (
            <button className="mt-4 w-full border-2 border-ink bg-ink py-2 font-display text-xs uppercase tracking-widest text-paper active:translate-x-[1px] active:translate-y-[1px]">
              Participar
            </button>
          ) : (
            <div className="mt-4">
              <div className="mb-1 flex items-end justify-between">
                <span className="font-display text-[9px] uppercase tracking-wider text-ink">
                  {diasRestantes}d restantes
                </span>
                <span className={`font-display text-[11px] ${BARRA_TEXTO[desafio.acentoBarra]}`}>
                  {progresso}%
                </span>
              </div>
              <div className="h-4 w-full border-2 border-ink bg-paper">
                <div
                  className={`h-full ${BARRA_FILL[desafio.acentoBarra]}`}
                  style={{ width: `${progresso}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {desafio.cta !== "participar" && (
        <div className="flex items-center justify-between border-t-2 border-ink bg-paper px-4 py-2">
          <span className="font-display text-[10px] uppercase tracking-widest text-ink">
            {desafio.minhaPosicao > 0
              ? `${desafio.minhaPosicao}º de ${desafio.totalMembros}`
              : `${desafio.totalMembros} membros`}
          </span>
          <span className="truncate pl-3 text-[11px] italic text-ink-soft">
            {desafio.ultimaAtividade}
          </span>
        </div>
      )}
    </article>
  );
}

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
        supabase.from("group_members").select("user_id, competes").eq("group_id", g.id),
        supabase
          .from("challenge_checkins")
          .select(
            "user_id, session:sessions(started_at, duration_seconds, unit_start, unit_end, chapter_start, chapter_end)",
          )
          .eq("group_id", g.id),
      ]);

      const memberIds = (members ?? []).map((m) => m.user_id);
      const { data: profiles } = memberIds.length
        ? await supabase.from("profiles").select("id, display_name").in("id", memberIds)
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
    <div className="min-h-full bg-paper px-4 pt-5 pb-8">
      {/* Header */}
      <header className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl uppercase leading-none text-ink">Juntos</h1>
          <p className="mt-2 text-[13px] font-medium text-ink/75">
            Desafios coletivos e clubes de leitura
          </p>
        </div>
        <Link
          href="/juntos/novo"
          aria-label="Criar desafio"
          className="flex h-11 w-11 shrink-0 items-center justify-center border-2 border-ink bg-mustard font-display text-2xl leading-none text-ink shadow-hard-sm active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
        >
          +
        </Link>
      </header>

      {error && <p className="mb-4 text-sm font-medium text-coral">{error}</p>}

      {/* Entrar com código */}
      <CodigoInput />

      {/* Desafios do Lovable (mock) */}
      {desafiosAtivos.length > 0 && (
        <ul className="mt-6 space-y-7">
          {desafiosAtivos.map((d) => (
            <li key={d.id}>
              {d.cta === "participar" ? (
                <DesafioCard desafio={d} />
              ) : (
                <Link
                  href={`/juntos/${d.id}`}
                  className="block active:translate-x-[1px] active:translate-y-[1px]"
                >
                  <DesafioCard desafio={d} />
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Desafios reais do Supabase */}
      {challengeCards.length > 0 && (
        <>
          <h2 className="mt-8 mb-3 font-display text-[11px] uppercase tracking-widest text-ink-soft">
            Seus desafios
          </h2>
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
                    <div className="h-full bg-mustard" style={{ width: `${progress}%` }} />
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
          </div>
        </>
      )}

      {/* Desafios encerrados (mock) */}
      {desafiosEncerrados.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 font-display text-[11px] uppercase tracking-widest text-ink-soft">
            Encerrados
          </h2>
          <ul className="space-y-3">
            {desafiosEncerrados.map((d) => (
              <li
                key={d.id}
                className="flex items-center justify-between border-2 border-ink bg-paper px-3 py-2 opacity-80"
              >
                <div className="min-w-0">
                  <p className="truncate font-serif text-sm font-bold italic text-ink">
                    {d.emoji} {d.nome}
                  </p>
                  <p className="text-[11px] text-ink-soft">
                    🏆 {d.vencedor} · {d.recap}
                  </p>
                </div>
                <button className="shrink-0 border-2 border-ink bg-paper px-2 py-1 font-display text-[9px] uppercase tracking-widest text-ink">
                  Recap
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function CodigoInput() {
  return (
    <form action={joinChallengeByCode}>
      <label className="mb-2 block font-display text-[10px] uppercase tracking-widest text-ink-soft">
        Entrar com código
      </label>
      <div className="flex items-stretch gap-2">
        <input
          name="code"
          placeholder="6 caracteres"
          maxLength={6}
          className="flex-1 border-2 border-ink bg-paper px-3 py-3 font-mono text-sm uppercase tracking-[0.3em] text-ink shadow-hard-sm placeholder:text-ink/30 focus:outline-none focus:shadow-hard"
        />
        <button
          type="submit"
          className="border-2 border-ink bg-ink px-4 font-display text-xs uppercase tracking-widest text-paper shadow-hard-sm active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
        >
          Entrar
        </button>
      </div>
    </form>
  );
}
