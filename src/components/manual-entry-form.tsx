"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { createSession } from "@/app/actions/sessions";
import { CheckinSection } from "@/components/checkin-section";

type Book = { id: string; title: string };
type ActiveChallenge = { id: string; name: string; emoji: string | null };

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
  serverError,
  activeChallenges,
}: {
  books: Book[];
  serverError?: string;
  activeChallenges: ActiveChallenge[];
}) {
  const [date, setDate] = useState(todayInputValue);
  const [minutes, setMinutes] = useState("");
  const [query, setQuery] = useState("");
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [timeOfDay] = useState(() => new Date().toTimeString().slice(0, 8));

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return books.filter((b) => b.title.toLowerCase().includes(q)).slice(0, 5);
  }, [books, query]);

  const durationSeconds = (Number(minutes) || 0) * 60;

  return (
    <>
      <header className="flex items-center gap-2 border-b-2 border-ink bg-white px-4 py-3">
        <Link href="/ler" aria-label="Voltar" className="text-lg">
          ←
        </Link>
        <span className="font-serif text-lg">Registro manual</span>
      </header>
      <main className="mx-auto w-full max-w-sm flex-1 px-4 py-6">
        {serverError && (
          <p className="mb-4 text-sm font-medium text-coral">{serverError}</p>
        )}
        <form action={createSession} className="flex flex-col gap-4">
          <input type="hidden" name="item_id" value={selectedBook?.id ?? ""} />
          <input
            type="hidden"
            name="started_at"
            value={`${date}T${timeOfDay}`}
          />
          <input type="hidden" name="duration_seconds" value={durationSeconds} />

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

          <div className="flex gap-3">
            <label className="flex-1 text-sm font-medium">
              Minutos
              <input
                type="number"
                required
                min={1}
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                className="mt-1 block w-full rounded border-2 border-ink bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-moss-dark"
              />
            </label>
            <label className="flex-1 text-sm font-medium">
              Páginas
              <input
                type="number"
                name="pages_read"
                required
                min={0}
                className="mt-1 block w-full rounded border-2 border-ink bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-moss-dark"
              />
            </label>
          </div>

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

          <CheckinSection challenges={activeChallenges} />

          <button
            type="submit"
            className="rounded-md border-2 border-ink bg-moss-dark px-4 py-2.5 font-display text-sm text-paper shadow-hard-sm"
          >
            Salvar leitura
          </button>
        </form>
      </main>
    </>
  );
}
