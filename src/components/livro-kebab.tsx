"use client";

import { useState, useTransition } from "react";
import { deleteMediaItem } from "@/app/actions/media-items";

// Kebab (3 pontos) do meu livro: por enquanto só "Excluir livro", com
// confirmação — a exclusão leva junto sessões, notas e comentários do livro.
export function LivroKebab({ itemId, titulo }: { itemId: string; titulo: string }) {
  const [menuAberto, setMenuAberto] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const [excluindo, startDelete] = useTransition();

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Opções do livro"
        aria-expanded={menuAberto}
        onClick={() => setMenuAberto((v) => !v)}
        className="shadow-hard-sm flex h-9 w-9 items-center justify-center border-2 border-ink bg-paper active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <circle cx="12" cy="5" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="12" cy="19" r="2" />
        </svg>
      </button>

      {menuAberto && (
        <>
          <button
            type="button"
            aria-label="Fechar menu"
            className="fixed inset-0 z-10 bg-transparent"
            onClick={() => setMenuAberto(false)}
          />
          <div className="shadow-hard absolute right-0 top-full z-20 mt-2 w-44 border-2 border-ink bg-card p-1">
            <button
              type="button"
              onClick={() => {
                setMenuAberto(false);
                setConfirmar(true);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left font-display text-xs uppercase tracking-wider text-ink hover:bg-coral hover:text-paper"
            >
              <span aria-hidden>🗑️</span> Excluir livro
            </button>
          </div>
        </>
      )}

      {confirmar && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-ink/60 p-4 sm:items-center">
          <div className="shadow-hard w-full max-w-sm border-2 border-ink bg-card p-5">
            <p className="font-display text-lg uppercase leading-tight text-ink">Excluir livro?</p>
            <p className="mt-2 text-sm text-ink-soft">
              Todas as anotações e o progresso de{" "}
              <strong className="text-ink">{titulo}</strong> serão perdidos. Essa ação não pode
              ser desfeita.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmar(false)}
                className="shadow-hard-sm flex-1 border-2 border-ink bg-paper py-3 font-display text-xs uppercase tracking-widest text-ink active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={excluindo}
                onClick={() => startDelete(async () => { await deleteMediaItem(itemId); })}
                className="shadow-hard-sm flex-1 border-2 border-ink bg-coral py-3 font-display text-xs uppercase tracking-widest text-paper active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-60"
              >
                {excluindo ? "Excluindo…" : "Excluir"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
