import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/supabase/auth";
import { joinChallengeByCode } from "@/app/actions/groups";
import { computeScores, daysRemaining, periodProgress } from "@/lib/challenges";
import { BookThumb } from "@/components/book-thumb";
import { EmptyState } from "@/components/empty-state";
import { nomeExibicao } from "@/lib/nome-exibicao";

type GroupRow = {
  id: string;
  name: string;
  emoji: string | null;
  scoring_metric: string;
  starts_at: string | null;
  ends_at: string | null;
};

/* ---------- helpers ---------- */






/**
 * Estado do desafio no card, na ordem definida com a Gisela:
 * contagem regressiva nos 7 dias antes de começar → "aberto" quando começa →
 * "lendo agora" assim que a pessoa faz o primeiro check-in.
 *
 * A contagem só entra dentro da janela de 7 dias justamente para o texto do
 * badge nunca passar de "Inicia em 7 dias": é o maior rótulo possível, e cabe
 * na largura do card mesmo num aparelho de 360px.
 */
const JANELA_CONTAGEM_DIAS = 7;

function estadoDoDesafio(
  startsAt: string | null,
  fizCheckin: boolean,
): { texto: string; tom: string } {
  const hoje = new Date().toISOString().slice(0, 10);

  if (startsAt && startsAt > hoje) {
    const dias = Math.max(
      1,
      Math.round(
        (+new Date(`${startsAt}T00:00:00Z`) - +new Date(`${hoje}T00:00:00Z`)) / 86_400_000,
      ),
    );
    if (dias > JANELA_CONTAGEM_DIAS) return { texto: "Em breve", tom: "bg-paper text-ink" };
    return { texto: `Inicia em ${dias} ${dias === 1 ? "dia" : "dias"}`, tom: "bg-mustard text-ink" };
  }

  if (fizCheckin) return { texto: "Lendo agora", tom: "bg-coral text-paper" };
  return { texto: "Aberto", tom: "bg-moss text-paper" };
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

      // Capa do card = capa do último livro em que EU fiz check-in neste
      // desafio. Sem check-in meu, o card segue sem capa.
      const { data: meuUltimoCheckin } = await supabase
        .from("challenge_checkins")
        .select(
          "created_at, session:sessions(item:media_items(title, cover_kind, cover_url, cover_palette))",
        )
        .eq("group_id", g.id)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const sessao = Array.isArray(meuUltimoCheckin?.session)
        ? meuUltimoCheckin?.session[0]
        : meuUltimoCheckin?.session;
      const itemBruto = Array.isArray(sessao?.item) ? sessao?.item[0] : sessao?.item;
      const capa = itemBruto
        ? {
            title: itemBruto.title as string,
            cover_kind: itemBruto.cover_kind as string,
            cover_url: (itemBruto.cover_url as string | null) ?? null,
            cover_palette: (itemBruto.cover_palette as number) ?? 0,
          }
        : null;

      const memberIds = (members ?? []).map((m) => m.user_id);
      const { data: profiles } = memberIds.length
        ? await supabase.from("profiles").select("id, display_name, username").in("id", memberIds)
        : { data: [] as { id: string; display_name: string | null; username: string | null }[] };
      const nameById = new Map(
        (profiles ?? []).map((p) => [
          p.id,
          nomeExibicao(p.display_name as string | null, p.username as string | null),
        ]),
      );

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

      return { group: g, members: membersWithNames, myRank: myRank || null, capa, fizCheckin: Boolean(meuUltimoCheckin) };
    }),
  );

  return (
    <div className="min-h-full bg-paper px-4 pt-5 pb-8">
      {/* Header */}
      <header className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl uppercase leading-none tracking-tight text-ink">Juntos</h1>
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

      {/* Desafios reais do Supabase */}
      {challengeCards.length > 0 && (
        <>
          <h2 className="mt-8 mb-3 font-display text-[11px] uppercase tracking-widest text-ink-soft">
            Seus desafios
          </h2>
          <div className="flex flex-col gap-3">
            {challengeCards.map(({ group, members, myRank, capa, fizCheckin }) => {
              const remaining = daysRemaining(group.ends_at);
              const progress = periodProgress(group.starts_at, group.ends_at);
              const estado = estadoDoDesafio(group.starts_at, fizCheckin);
              return (
                <Link
                  key={group.id}
                  href={`/juntos/${group.id}`}
                  className="relative block rounded-md border-2 border-navy px-3 py-3 shadow-hard-sm"
                >
                  <span
                    className={`absolute -right-1 -top-3 z-10 whitespace-nowrap rotate-2 border-2 border-ink px-2.5 py-1 font-display text-[10px] uppercase tracking-wider ${estado.tom}`}
                  >
                    {estado.texto}
                  </span>

                  <div className="flex gap-3">
                    {/* Capa = último livro em que fiz check-in aqui */}
                    {capa && (
                      <BookThumb item={capa} className="shadow-[3px_3px_0_0_var(--color-mustard)]" />
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2 pr-[120px]">
                        <h3 className="min-w-0 font-serif text-base font-semibold">
                          {group.emoji} {group.name}
                        </h3>
                      </div>
                      {capa && (
                        <p className="mt-0.5 truncate font-display text-[9px] uppercase tracking-widest text-ink/60">
                          {capa.title}
                        </p>
                      )}
                      {remaining !== null && (
                        <p className="mt-1 font-display text-[10px] uppercase tracking-wider text-ink/70">
                          {remaining} dias restantes
                        </p>
                      )}
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
                    </div>
                  </div>
                </Link>
              );
            })}

          </div>
        </>
      )}

      {/* Encerrados vivem fora do bloco acima: quem só tem desafio encerrado
          também precisa vê-los. */}
      {ended.length > 0 && (
        <>
          <h2 className="mb-3 mt-8 font-display text-[11px] uppercase tracking-widest text-ink-soft">
            Encerrados
          </h2>
          <div className="flex flex-col gap-3">
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

      {challengeCards.length === 0 && ended.length === 0 && (
        <EmptyState
          mascote="confiante"
          titulo="Nenhum desafio ainda"
          texto="Desafio é ler junto: cada um faz seu check-in e o placar acompanha. Crie o seu no + acima, ou entre no de um amigo com o código de convite."
          acao={{ href: "/juntos/novo", label: "Criar desafio" }}
        />
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
