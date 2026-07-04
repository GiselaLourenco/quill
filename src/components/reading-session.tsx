"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createSession } from "@/app/actions/sessions";
import { formatTimer } from "@/lib/reading-stats";

const TAG_OPTIONS = [
  { value: "flowed", label: "a leitura fluiu" },
  { value: "no_distractions", label: "sem distrações" },
  { value: "phone", label: "olhei o celular" },
  { value: "hard", label: "foi difícil" },
];

export function ReadingSession({
  itemId,
  title,
}: {
  itemId: string;
  title: string;
}) {
  const [startedAt] = useState(() => new Date().toISOString());
  const [elapsed, setElapsed] = useState(0);
  const [stopped, setStopped] = useState(false);

  useEffect(() => {
    if (stopped) return;
    const interval = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [stopped]);

  return (
    <>
      <header className="flex items-center justify-between border-b-2 border-ink bg-white px-4 py-3">
        <Link href={`/books/${itemId}`} aria-label="Cancelar sessão" className="text-lg">
          ×
        </Link>
        <span className="text-sm text-ink/65">{title}</span>
        <span className="w-4" aria-hidden="true" />
      </header>

      <main className="flex flex-1 flex-col items-center gap-6 px-6 py-8">
        {/* Placeholder simples pro cenário aconchegante — o personagem Quill
            animado entra aqui quando a arte existir (ver MARCA-Quill.md). */}
        <div className="relative aspect-[16/11] w-full max-w-xs overflow-hidden rounded-2xl bg-[#69B997]">
          <div className="absolute inset-x-0 bottom-0 h-[40%] bg-[#4A9974]/60" />
          <div className="absolute bottom-[22%] left-[18%] h-[55%] w-[14%] rounded-sm bg-[#1D4A34]/35" />
          <div className="absolute bottom-[22%] left-[34%] h-[70%] w-[14%] rounded-sm bg-[#1D4A34]/35" />
          <div className="absolute bottom-[22%] left-[50%] h-[45%] w-[14%] rounded-sm bg-[#1D4A34]/35" />
          <div className="absolute bottom-[22%] left-[66%] h-[60%] w-[14%] rounded-sm bg-[#1D4A34]/35" />
          <div className="absolute bottom-[8%] right-[14%] h-[34%] w-[22%] rounded-t-full bg-[#1D4A34]/50" />
        </div>

        <div className="font-serif text-4xl font-semibold tracking-wide">
          {formatTimer(elapsed)}
        </div>

        <button
          type="button"
          aria-label="Parar sessão"
          onClick={() => setStopped(true)}
          className="flex h-[76px] w-[76px] items-center justify-center rounded-full border-2 border-ink bg-coral text-2xl text-paper shadow-hard-sm"
        >
          ■
        </button>
      </main>

      {stopped && (
        <div className="fixed inset-0 flex items-center justify-center bg-ink/45 px-4">
          <div className="w-full max-w-xs rounded-md border-2 border-ink bg-white p-4">
            <h2 className="mb-3 font-serif text-lg font-semibold">
              Como foi a leitura?
            </h2>
            <form action={createSession} className="flex flex-col gap-4">
              <input type="hidden" name="item_id" value={itemId} />
              <input type="hidden" name="started_at" value={startedAt} />
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

              <button
                type="submit"
                className="rounded-md border-2 border-ink bg-moss-dark px-4 py-2.5 font-display text-sm text-paper shadow-hard-sm"
              >
                Salvar sessão
              </button>
              <Link
                href={`/books/${itemId}`}
                className="text-center text-xs text-ink/60"
              >
                Descartar sessão
              </Link>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
