"use client";

import { useEffect, useMemo, useState } from "react";
import { createSession } from "@/app/actions/sessions";
import { formatTimer } from "@/lib/reading-stats";

type Book = { id: string; title: string };

const TAG_OPTIONS = [
  { value: "flowed", label: "a leitura fluiu" },
  { value: "no_distractions", label: "sem distrações" },
  { value: "phone", label: "olhei o celular" },
  { value: "hard", label: "foi difícil" },
];

export function FreeReadingSession({ books }: { books: Book[] }) {
  const [phase, setPhase] = useState<"idle" | "running" | "stopped">("idle");
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [query, setQuery] = useState("");
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);

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

  function handleCancel() {
    setPhase("idle");
    setElapsed(0);
    setStartedAt(null);
    setSelectedBook(null);
    setQuery("");
  }

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return books.filter((b) => b.title.toLowerCase().includes(q)).slice(0, 5);
  }, [books, query]);

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
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-6 py-8">
      <div className="flex w-full justify-start">
        <button
          type="button"
          aria-label="Cancelar sessão"
          onClick={handleCancel}
          className="text-lg"
        >
          ×
        </button>
      </div>

      <div className="font-serif text-4xl font-semibold tracking-wide">
        {formatTimer(elapsed)}
      </div>

      {phase === "running" && (
        <button
          type="button"
          aria-label="Parar sessão"
          onClick={() => setPhase("stopped")}
          className="flex h-[76px] w-[76px] items-center justify-center rounded-full border-2 border-ink bg-coral text-2xl text-paper shadow-hard-sm"
        >
          ■
        </button>
      )}

      {phase === "stopped" && (
        <div className="fixed inset-0 flex items-center justify-center bg-ink/45 px-4">
          <div className="w-full max-w-xs rounded-md border-2 border-ink bg-white p-4">
            <h2 className="mb-3 font-serif text-lg font-semibold">
              Como foi a leitura?
            </h2>
            <form action={createSession} className="flex flex-col gap-4">
              <input
                type="hidden"
                name="item_id"
                value={selectedBook?.id ?? ""}
              />
              <input type="hidden" name="started_at" value={startedAt ?? ""} />
              <input type="hidden" name="duration_seconds" value={elapsed} />

              <label className="text-sm font-medium">
                Páginas lidas
                <input
                  type="number"
                  name="pages_read"
                  required
                  min={0}
                  className="mt-1 block w-full rounded border-2 border-ink bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-moss-dark"
                />
              </label>

              <fieldset>
                <legend className="mb-1.5 text-sm font-medium">
                  Tags <span className="font-normal text-ink/60">(opcional)</span>
                </legend>
                <div className="flex flex-wrap gap-2">
                  {TAG_OPTIONS.map((tag) => (
                    <label key={tag.value}>
                      <input
                        type="checkbox"
                        name="tags"
                        value={tag.value}
                        className="peer sr-only"
                      />
                      <span className="block cursor-pointer rounded-full border-2 border-ink bg-white px-3 py-1.5 text-xs font-medium peer-checked:bg-mustard">
                        {tag.label}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="border-t-2 border-cover-border pt-3">
                <label className="text-sm font-medium">
                  Vincular a um livro{" "}
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
                  <>
                    <button
                      type="button"
                      onClick={() => setSelectedBook(null)}
                      className="mb-2 text-xs text-ink/60 underline"
                    >
                      Remover vínculo
                    </button>
                    <label className="mt-2 block text-sm font-medium">
                      Capítulo atual{" "}
                      <span className="font-normal text-ink/60">(opcional)</span>
                      <input
                        type="number"
                        name="chapter"
                        min={0}
                        className="mt-1 block w-full rounded border-2 border-ink bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-moss-dark"
                      />
                    </label>
                  </>
                )}
              </div>

              <button
                type="submit"
                className="rounded-md border-2 border-ink bg-moss-dark px-4 py-2.5 font-display text-sm text-paper shadow-hard-sm"
              >
                Salvar sessão
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="text-center text-xs text-ink/60"
              >
                Descartar sessão
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
