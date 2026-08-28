"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteGoal } from "@/app/actions/goals";

/** Lixeira discreta ao lado da meta — mesma cor da borda do card. */
export function ExcluirMeta({ goalId, rotulo }: { goalId: string; rotulo: string }) {
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  const [excluindo, startDelete] = useTransition();

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirmando(true)}
        aria-label={`Excluir meta: ${rotulo}`}
        className="shrink-0 text-cover-border transition-colors hover:text-coral"
      >
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
          <path d="M10 11v6M14 11v6" />
        </svg>
      </button>

      {confirmando && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/60 p-4 sm:items-center">
          <div className="shadow-hard w-full max-w-sm rounded-md border-2 border-ink bg-card p-5">
            <p className="font-display text-lg uppercase leading-tight text-ink">Excluir meta?</p>
            <p className="mt-2 text-sm text-ink-soft">
              <strong className="text-ink">{rotulo}</strong> sai do painel e da tela de metas.
              O histórico de leitura não muda.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmando(false)}
                className="shadow-hard-sm flex-1 rounded-md border-2 border-ink bg-paper py-3 font-display text-xs uppercase tracking-widest text-ink active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={excluindo}
                onClick={() =>
                  startDelete(async () => {
                    await deleteGoal(goalId);
                    setConfirmando(false);
                    router.refresh();
                  })
                }
                className="shadow-hard-sm flex-1 rounded-md border-2 border-ink bg-coral py-3 font-display text-xs uppercase tracking-widest text-paper active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-60"
              >
                {excluindo ? "Excluindo…" : "Excluir"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
