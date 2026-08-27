"use client";

import { useRouter } from "next/navigation";
import { BookCoverLovable } from "@/components/book-cover-lovable";
import { StarRating } from "@/components/star-rating";
import { meusLivros, STATUS_META } from "@/lib/mock-estante";
import type { StatusLivro } from "@/lib/types";

const VALID: StatusLivro[] = ["lendo", "quero_ler", "terminei", "recomendado", "abandonei"];

export default function StatusGridPage({
  params,
}: {
  params: { status: string };
}) {
  const router = useRouter();
  const s = (VALID as string[]).includes(params.status)
    ? (params.status as StatusLivro)
    : "lendo";
  const meta = STATUS_META[s];
  const items = meusLivros
    .filter((l) => l.status === s)
    .sort((a, b) => b.atualizadoEm.localeCompare(a.atualizadoEm));

  return (
    <div className="flex min-h-full flex-col bg-paper">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b-2 border-ink bg-paper px-3 py-3">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Voltar"
          className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-ink bg-paper shadow-hard-sm"
        >
          ‹
        </button>
        <span className={`h-3 w-3 rounded-sm border border-ink ${meta.corBg}`} />
        <h1 className="font-display text-lg text-ink">{meta.label}</h1>
        <span className="text-xs text-ink-soft">· {items.length}</span>
      </header>

      {items.length === 0 ? (
        <p className="px-6 py-10 text-center text-sm text-ink-soft">
          Nada em {meta.label.toLowerCase()} ainda.
        </p>
      ) : (
        <ul className="grid grid-cols-3 gap-4 px-4 py-4">
          {items.map((livro) => (
            <li key={livro.id} className="flex flex-col gap-1">
              <button
                type="button"
                onClick={() => router.push(`/books/${livro.id}`)}
              >
                <BookCoverLovable livro={livro} size="md" />
              </button>
              <div className="flex justify-center">
                <StarRating value={livro.nota ?? 0} size="sm" />
              </div>
              <p className="line-clamp-2 text-[10px] font-semibold text-ink">{livro.titulo}</p>
              <p className="line-clamp-1 text-[9px] text-ink-soft">{livro.autor}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
