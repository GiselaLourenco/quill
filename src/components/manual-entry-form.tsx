"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createSession, type SessionUnit } from "@/app/actions/sessions";
import { PostSession } from "@/components/post-session";
import type { ActiveChallenge } from "@/lib/challenges";

type Book = { id: string; title: string };

const TAG_OPTIONS = [
  { value: "flowed", label: "a leitura fluiu" },
  { value: "no_distractions", label: "sem distrações" },
  { value: "phone", label: "olhei o celular" },
  { value: "hard", label: "foi difícil" },
];

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

export function ManualEntryForm({
  books,
  activeChallenges,
}: {
  books: Book[];
  activeChallenges: ActiveChallenge[];
}) {
  const router = useRouter();
  const [date, setDate] = useState(todayInputValue);
  const [minutes, setMinutes] = useState("");
  const [unit, setUnit] = useState<SessionUnit>("chapters");
  const [quantity, setQuantity] = useState("");
  const [tags, setTags] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [timeOfDay] = useState(() => new Date().toTimeString().slice(0, 8));
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, startSave] = useTransition();

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return books.filter((b) => b.title.toLowerCase().includes(q)).slice(0, 5);
  }, [books, query]);

  const durationSeconds = (Number(minutes) || 0) * 60;

  function toggleTag(value: string) {
    setTags((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }

  function handleSave() {
    if (durationSeconds <= 0) {
      setError("Informe quantos minutos você leu.");
      return;
    }
    setError(null);
    startSave(async () => {
      const result = await createSession({
        itemId: selectedBook?.id ?? null,
        startedAt: `${date}T${timeOfDay}`,
        durationSeconds,
        unit,
        quantity: quantity ? Number(quantity) : null,
        tags: [...tags],
      });
      if (result.error || !result.sessionId) {
        setError(result.error ?? "Algo deu errado.");
        return;
      }
      setSessionId(result.sessionId);
    });
  }

  return (
    <>
      <header className="flex items-center gap-2 border-b-2 border-ink bg-white px-4 py-3">
        <Link href="/ler" aria-label="Voltar" className="text-lg">
          ←
        </Link>
        <span className="font-serif text-lg">Registro manual</span>
      </header>

      {sessionId ? (
        <PostSession
          sessionId={sessionId}
          book={selectedBook}
          durationSeconds={durationSeconds}
          quantity={quantity ? Number(quantity) : null}
          unit={unit}
          challenges={activeChallenges}
          onDone={() => router.push("/ler")}
        />
      ) : (
        <main className="mx-auto w-full max-w-sm flex-1 px-4 py-6">
          <div className="flex flex-col gap-4">
            <label className="text-sm font-medium">
              Data
              <input
                type="date"
                value={date}
                max={todayInputValue()}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 block w-full rounded border-2 border-ink bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-moss-dark"
              />
            </label>

            <label className="text-sm font-medium">
              Minutos lidos
              <input
                type="number"
                required
                min={1}
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                className="mt-1 block w-full rounded border-2 border-ink bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-moss-dark"
              />
            </label>

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
              {isSaving ? "Salvando…" : "Salvar leitura"}
            </button>
          </div>
        </main>
      )}
    </>
  );
}
