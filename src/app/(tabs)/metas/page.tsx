import Link from "next/link";
import { AppImage } from "@/components/app-image";
import { EmptyState } from "@/components/empty-state";
import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/supabase/auth";
import { ConfigurarMetas, type MetaConfiguravel } from "@/components/configurar-metas";
import { ExcluirMeta } from "@/components/excluir-meta";
import { computeStreak } from "@/lib/gamification";
import {
  goalProgress,
  computePagesPerDay,
  computeMinutesPerDay,
  quillPhase,
  QUILL_PHASES,
  type SessionRow,
} from "@/lib/gamification";

export default async function MetasPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const userId = await requireUserId();
  const { error } = await searchParams;
  const year = new Date().getFullYear();

  const supabase = await createClient();
  const [{ data: sessions }, { count: finishedThisYear }, { data: goals }] =
    await Promise.all([
      supabase
        .from("sessions")
        .select("started_at, duration_seconds, unit_start, unit_end, chapter_start, chapter_end, quality_tags, item_id")
        .eq("user_id", userId),
      supabase
        .from("media_items")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("status", "finished")
        .gte("finished_at", `${year}-01-01`)
        .lte("finished_at", `${year}-12-31`),
      supabase
        .from("goals")
        .select("id, type, target_value, period_start, period_end")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
    ]);

  const sessionRows = (sessions ?? []) as SessionRow[];

  // ---- Valores atuais das três metas configuráveis --------------------
  const agora = new Date();
  const prefixoMes = `${year}-${String(agora.getMonth() + 1).padStart(2, "0")}`;
  const horasNoMes = Math.round(
    sessionRows
      .filter((s) => s.started_at?.startsWith(prefixoMes))
      .reduce((soma, s) => soma + (s.duration_seconds ?? 0), 0) / 3600,
  );
  const streakAtual = computeStreak(sessionRows).current;
  const alvoPorTipo = new Map(
    (goals ?? []).map((g) => [g.type as string, Number(g.target_value)]),
  );

  const metasConfiguraveis: MetaConfiguravel[] = [
    {
      type: "books_per_year",
      label: "Livros no ano",
      unidade: "livros",
      atual: finishedThisYear ?? 0,
      alvo: alvoPorTipo.get("books_per_year") ?? 0,
      passo: 1,
      max: 365,
    },
    {
      type: "hours_per_month",
      label: "Horas por mês",
      unidade: "h",
      atual: horasNoMes,
      alvo: alvoPorTipo.get("hours_per_month") ?? 0,
      passo: 1,
      max: 500,
    },
    {
      type: "streak_days",
      label: "Sequência diária",
      unidade: "dias",
      atual: streakAtual,
      alvo: alvoPorTipo.get("streak_days") ?? 0,
      passo: 1,
      max: 365,
    },
  ];
  const goalCtx = {
    sessions: sessionRows,
    pagesPerDay: computePagesPerDay(sessionRows),
    minutesPerDay: computeMinutesPerDay(sessionRows),
    finishedThisYear: finishedThisYear ?? 0,
    hoursThisMonth: horasNoMes,
    currentStreak: streakAtual,
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

        {/* Meta anual em destaque — é ela que evolui o Quill (PRD §6.4/§6.5) */}
        {(() => {
          const annual = (goals ?? []).find((g) => g.type === "books_per_year");
          if (!annual) {
            return (
              <div className="mb-5 rounded-md border-2 border-dashed border-moss-dark bg-white p-4 text-center">
                <p className="text-2xl">🌱</p>
                <p className="mt-1 font-serif text-base font-semibold">
                  Defina sua meta do ano
                </p>
                <p className="mt-1 text-xs text-ink/65">
                  É ela que faz o Quill crescer — crie uma meta de “Livros / ano”
                  aqui embaixo.
                </p>
              </div>
            );
          }
          const progress = goalProgress(annual, goalCtx);
          const phase = quillPhase(progress.percent);
          return (
            <section className="mb-5 rounded-md border-2 border-moss-dark bg-white p-4">
              <div className="flex items-baseline justify-between">
                <h2 className="font-serif text-base font-semibold">Meta do ano</h2>
                <span className="font-display text-sm text-moss-dark">
                  {progress.percent}%
                </span>
              </div>
              <p className="mt-0.5 text-xs text-ink/70">
                {progress.label} · você já leu{" "}
                <span className="font-semibold text-ink">{progress.current}</span>
              </p>
              <div className="mt-2 h-2 overflow-hidden rounded-full border border-cover-border bg-paper">
                <div
                  className="h-full bg-moss-dark"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
              <div className="mt-3 flex items-end justify-around rounded-md border border-dashed border-cover-border bg-[#fdf3dd] px-2 pb-3 pt-4">
                {QUILL_PHASES.map((p) => {
                  const active = p.key === phase.key;
                  return (
                    <div
                      key={p.key}
                      // As fases que ainda não chegaram ficam apagadas, mas não
                      // invisíveis: a 45% o jovem e o adulto sumiam contra o
                      // creme do bloco e a faixa não comunicava a progressão.
                      className={`flex flex-col items-center rounded-md px-2 py-1 text-center ${
                        active ? "outline-2 outline-moss-dark" : "opacity-70"
                      }`}
                    >
                      <AppImage
                        slot={`metas.fase.${p.key}`}
                        src={p.img}
                        alt=""
                        aria-hidden
                        // 80/64 em vez de 56/44: as artes têm zoom alto
                        // configurado (186–227%), então numa caixa pequena o
                        // enquadramento cortava o Quill e sobrava pouco do
                        // desenho pra ler.
                        width={active ? 80 : 64}
                        height={active ? 80 : 64}
                        className={active ? "h-20 w-20 object-contain" : "h-16 w-16 object-contain"}
                      />
                      <span
                        className={`text-[10px] font-bold ${active ? "text-moss-dark" : ""}`}
                      >
                        {p.label}
                        {active && " ✓"}
                      </span>
                      <span className="text-[9px] text-ink/55">{p.range}</span>
                    </div>
                  );
                })}
              </div>
              <p className="mt-2 text-[10.5px] text-ink/60">
                O Quill cresce junto com a sua meta.
                {progress.dailyTargetLabel && <> {progress.dailyTargetLabel}.</>}
              </p>
            </section>
          );
        })()}

        <h2 className="mb-2 font-display text-sm uppercase tracking-tight text-ink">Suas metas</h2>
        <div className="mb-5 flex flex-col gap-2">
          {(goals ?? []).map((g) => {
              const progress = goalProgress(g, goalCtx);
              return (
                <div
                  key={g.id}
                  className="rounded-md border-2 border-cover-border px-3 py-2.5"
                >
                  <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
                    <span className="min-w-0 truncate">{progress.label}</span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="text-ink/65">
                        {progress.current} / {g.target_value}
                      </span>
                      <ExcluirMeta goalId={g.id as string} rotulo={progress.label} />
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
          {(goals ?? []).length === 0 && (
            <EmptyState
              compacto
              mascote="confiante"
              titulo="Nenhuma meta ainda"
              texto="Uma meta dá ritmo à leitura — e faz o Quill crescer junto. Toque em “Configurar metas” aqui embaixo."
            />
          )}
        </div>

        <ConfigurarMetas metas={metasConfiguraveis} />
      </main>
    </>
  );
}
