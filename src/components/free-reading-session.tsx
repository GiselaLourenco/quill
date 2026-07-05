"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { createSession, type SessionUnit } from "@/app/actions/sessions";
import { formatTimer } from "@/lib/reading-stats";
import { PostSession } from "@/components/post-session";
import type { ActiveChallenge } from "@/lib/challenges";

type Book = { id: string; title: string };

const TAG_OPTIONS = [
  { value: "flowed", label: "a leitura fluiu" },
  { value: "no_distractions", label: "sem distrações" },
  { value: "phone", label: "olhei o celular" },
  { value: "hard", label: "foi difícil" },
];

export function FreeReadingSession({
  books,
  activeChallenges,
  userId,
}: {
  books: Book[];
  activeChallenges: ActiveChallenge[];
  userId: string;
}) {
  const [phase, setPhase] = useState<
    "idle" | "running" | "paused" | "stopped" | "saved"
  >("idle");
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [query, setQuery] = useState("");
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [unit, setUnit] = useState<SessionUnit>("chapters");
  const [quantity, setQuantity] = useState("");
  const [tags, setTags] = useState<Set<string>>(new Set());
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [savedElapsed, setSavedElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, startSave] = useTransition();

  useEffect(() => {
    if (phase !== "running") return;
    const interval = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [phase]);

  function handlePlay() {
    setStartedAt(new Date().toISOString());
    setElapsed(0);
    setPhase("running");
  }

  function reset() {
    setPhase("idle");
    setElapsed(0);
    setStartedAt(null);
    setSelectedBook(null);
    setQuery("");
    setUnit("chapters");
    setQuantity("");
    setTags(new Set());
    setSessionId(null);
    setError(null);
  }

  function toggleTag(value: string) {
    setTags((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }

  function handleSave() {
    setError(null);
    startSave(async () => {
      const result = await createSession({
        itemId: selectedBook?.id ?? null,
        startedAt: startedAt ?? new Date().toISOString(),
        durationSeconds: elapsed,
        unit,
        quantity: quantity ? Number(quantity) : null,
        tags: [...tags],
      });
      if (result.error || !result.sessionId) {
        setError(result.error ?? "Algo deu errado.");
        return;
      }
      setSessionId(result.sessionId);
      setSavedElapsed(elapsed);
      setPhase("saved");
    });
  }

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return books.filter((b) => b.title.toLowerCase().includes(q)).slice(0, 5);
  }, [books, query]);

  if (phase === "saved" && sessionId) {
    return (
      <PostSession
        sessionId={sessionId}
        userId={userId}
        book={selectedBook}
        durationSeconds={savedElapsed}
        quantity={quantity ? Number(quantity) : null}
        unit={unit}
        challenges={activeChallenges}
        onDone={reset}
      />
    );
  }

  if (phase === "idle") {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6">
        <p className="max-w-[220px] text-center text-sm text-ink/70">
          Toque em play pra começar uma sessão de leitura — escolhe o livro
          só no final, se quiser.
        </p>
        <button
          type="button"
          aria-label="Começar a ler"
          onClick={handlePlay}
          className="flex h-[88px] w-[88px] items-center justify-center rounded-full border-2 border-ink bg-moss-dark text-3xl text-paper shadow-hard"
        >
          ▶
        </button>
        <Link
          href="/ler/manual"
          className="text-[11.5px] font-medium text-moss-dark underline"
        >
          registrar manualmente em vez disso
        </Link>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-6 py-8">
      <div className="flex w-full justify-start">
        <button
          type="button"
          aria-label="Cancelar sessão"
          onClick={reset}
          className="text-lg"
        >
          ×
        </button>
      </div>

      <div className="font-serif text-4xl font-semibold tracking-wide">
        {formatTimer(elapsed)}
      </div>

      {phase === "paused" && (
        <span className="rounded-full border-2 border-cover-border px-3 py-1 text-xs">
          pausado
        </span>
      )}

      {(phase === "running" || phase === "paused") && (
        <div className="flex gap-3.5">
          {phase === "running" ? (
            <button
              type="button"
              aria-label="Pausar sessão"
              onClick={() => setPhase("paused")}
              className="flex h-[64px] w-[64px] items-center justify-center rounded-full border-2 border-ink bg-mustard text-xl text-ink shadow-hard-sm"
            >
              ❚❚
            </button>
          ) : (
            <button
              type="button"
              aria-label="Retomar sessão"
              onClick={() => setPhase("running")}
              className="flex h-[64px] w-[64px] items-center justify-center rounded-full border-2 border-ink bg-moss-dark text-xl text-paper shadow-hard-sm"
            >
              ▶
            </button>
          )}
          <button
            type="button"
            aria-label="Parar sessão"
            onClick={() => setPhase("stopped")}
            className="flex h-[64px] w-[64px] items-center justify-center rounded-full border-2 border-ink bg-coral text-xl text-paper shadow-hard-sm"
          >
            ■
          </button>
        </div>
      )}

      {phase === "stopped" && (
        <div className="fixed inset-0 flex items-end justify-center bg-ink/45 sm:items-center sm:px-4">
          <div className="max-h-[92vh] w-full max-w-sm overflow-y-auto rounded-t-2xl border-2 border-ink bg-paper p-5 sm:rounded-md">
            <div className="mx-auto mb-3 h-1 w-11 rounded-full bg-cover-border/60 sm:hidden" />
            <h2 className="text-center font-serif text-lg font-semibold">
              Boa! {formatTimer(elapsed)} de leitura 🎉
            </h2>
            <p className="mb-4 text-center text-xs text-ink/60">
              Como foi a sessão?
            </p>

            <div className="flex flex-col gap-4">
              <div>
                <span className="text-sm font-medium">
                  Quanto você leu?{" "}
                  <span className="font-normal text-ink/60">(opcional)</span>
                </span>
                <div className="mt-1.5 flex overflow-hidden rounded-md border-2 border-ink text-center text-sm font-semibold">
                  {(
                    [
                      ["chapters", "Capítulos"],
                      ["pages", "Páginas"],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setUnit(value)}
                      className={`flex-1 py-2 ${unit === value ? "bg-navy font-display text-paper" : "bg-white"}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min={0}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder={
                    unit === "chapters" ? "capítulos lidos" : "páginas lidas"
                  }
                  className="mt-2 block w-full rounded border-2 border-ink bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-moss-dark"
                />
              </div>

              <fieldset>
                <legend className="mb-1.5 text-sm font-medium">
                  Como foi?{" "}
                  <span className="font-normal text-ink/60">(opcional)</span>
                </legend>
                <div className="flex flex-wrap gap-2">
                  {TAG_OPTIONS.map((tag) => (
                    <button
                      key={tag.value}
                      type="button"
                      onClick={() => toggleTag(tag.value)}
                      className={`rounded-full border-2 border-ink px-3 py-1.5 text-xs font-medium ${tags.has(tag.value) ? "bg-mustard" : "bg-white"}`}
                    >
                      {tag.label}
                    </button>
                  ))}
                </div>
              </fieldset>

              <div className="border-t-2 border-cover-border pt-3">
                <label className="text-sm font-medium">
                  Esse tempo foi em qual livro?{" "}
                  <span className="font-normal text-ink/60">(opcional)</span>
                  <input
                    value={selectedBook ? selectedBook.title : query}
                    onChange={(e) => {
                      setSelectedBook(null);
                      setQuery(e.target.value);
                    }}
                    placeholder="Buscar na estante..."
                    className="mt-1 mb-2 block w-full rounded border-2 border-ink bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-moss-dark"
                  />
                </label>
                {!selectedBook && matches.length > 0 && (
                  <ul className="mb-2 flex flex-col gap-1">
                    {matches.map((b) => (
                      <li key={b.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedBook(b);
                            setQuery("");
                          }}
                          className="w-full rounded border-2 border-ink bg-white px-3 py-1.5 text-left text-sm"
                        >
                          {b.title}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {selectedBook && (
                  <button
                    type="button"
                    onClick={() => setSelectedBook(null)}
                    className="text-xs text-ink/60 underline"
                  >
                    Remover vínculo
                  </button>
                )}
              </div>

              {error && <p className="text-sm font-medium text-coral">{error}</p>}

              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="rounded-md border-2 border-ink bg-moss-dark px-4 py-2.5 font-display text-sm text-paper shadow-hard-sm disabled:opacity-60"
              >
                {isSaving ? "Salvando…" : "Salvar sessão"}
              </button>
              <p className="-mt-2 text-center text-[11px] text-ink/60">
                só isso — notas, fotos e desafios vêm depois, se você quiser
              </p>
              <button
                type="button"
                onClick={reset}
                className="text-center text-xs text-ink/60"
              >
                Descartar sessão
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
