"use client";

import { useMemo, useState } from "react";
import { createChallenge } from "@/app/actions/groups";
import { SCORING_METRIC_OPTIONS } from "@/lib/challenges";

type Book = { id: string; title: string };

export function ChallengeForm({ books }: { books: Book[] }) {
  const [query, setQuery] = useState("");
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return books.filter((b) => b.title.toLowerCase().includes(q)).slice(0, 5);
  }, [books, query]);

  return (
    <form action={createChallenge} className="flex flex-col gap-4">
      <input type="hidden" name="item_id" value={selectedBook?.id ?? ""} />

      <div className="flex gap-2">
        <label className="w-20 text-sm font-medium">
          Emoji
          <input
            name="emoji"
            maxLength={4}
            placeholder="🏆"
            className="mt-1 block w-full rounded border-2 border-ink bg-white px-3 py-2 text-center text-lg focus:outline-none focus:ring-2 focus:ring-moss-dark"
          />
        </label>
        <label className="flex-1 text-sm font-medium">
          Nome
          <input
            name="name"
            required
            placeholder="Férias Literárias"
            className="mt-1 block w-full rounded border-2 border-ink bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-moss-dark"
          />
        </label>
      </div>

      <label className="text-sm font-medium">
        Descrição <span className="font-normal text-ink/60">(opcional)</span>
        <input
          name="description"
          className="mt-1 block w-full rounded border-2 border-ink bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-moss-dark"
        />
      </label>

      <label className="text-sm font-medium">
        Pontua por
        <select
          name="scoring_metric"
          className="mt-1 block w-full rounded border-2 border-ink bg-white px-3 py-2 text-sm"
        >
          {SCORING_METRIC_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>

      <div className="flex gap-2">
        <label className="flex-1 text-sm font-medium">
          Início
          <input
            type="date"
            name="starts_at"
            required
            className="mt-1 block w-full rounded border-2 border-ink bg-white px-2 py-2 text-sm"
          />
        </label>
        <label className="flex-1 text-sm font-medium">
          Fim
          <input
            type="date"
            name="ends_at"
            required
            className="mt-1 block w-full rounded border-2 border-ink bg-white px-2 py-2 text-sm"
          />
        </label>
      </div>

      <div>
        <label className="text-sm font-medium">
          Livro único <span className="font-normal text-ink/60">(opcional — deixe em branco pra livro livre)</span>
          <input
            value={selectedBook ? selectedBook.title : query}
            onChange={(e) => {
              setSelectedBook(null);
              setQuery(e.target.value);
            }}
            placeholder="Buscar na estante..."
            className="mt-1 block w-full rounded border-2 border-ink bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-moss-dark"
          />
        </label>
        {!selectedBook && matches.length > 0 && (
          <ul className="mt-2 flex flex-col gap-1">
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
            className="mt-2 text-xs text-ink/60 underline"
          >
            Remover livro
          </button>
        )}
      </div>

      <label className="flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" name="competes" defaultChecked className="h-4 w-4 accent-moss-dark" />
        Aparecer no ranking
      </label>

      <button
        type="submit"
        className="mt-1 rounded-md border-2 border-ink bg-moss-dark px-4 py-2.5 font-display text-sm text-paper shadow-hard-sm"
      >
        Criar desafio
      </button>
    </form>
  );
}
