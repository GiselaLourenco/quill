"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Portal } from "@/components/portal";
import { RodapeCartao } from "@/components/amigos-estantes";
import type { InteracoesCartao } from "@/lib/interacoes";

/** Painel da "Conversa" (ver ConversaAtualizacao): a atualização, curtidas e comentários. */
export function ConversaSheet({
  itemId,
  chave,
  frase,
  inicial,
}: {
  itemId: string;
  chave: string;
  frase: string;
  inicial: InteracoesCartao;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [aberto, setAberto] = useState(true);

  // Fechar tira o ?conversa da URL — voltar pra página não reabre o painel.
  function fechar() {
    setAberto(false);
    router.replace(pathname, { scroll: false });
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") fechar();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!aberto) return null;

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50" onClick={fechar}>
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Conversa"
          onClick={(e) => e.stopPropagation()}
          className="max-h-[85vh] w-full max-w-[430px] overflow-y-auto rounded-t-3xl border-x-2 border-t-2 border-ink bg-paper pb-8"
        >
          <div className="sticky top-0 z-10 flex items-center justify-between border-b-2 border-ink bg-paper px-4 py-3">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-ink-soft">Conversa</p>
              <h2 className="truncate font-display text-base uppercase tracking-tight text-ink">{frase}</h2>
            </div>
            <button
              type="button"
              onClick={fechar}
              aria-label="Fechar"
              className="shadow-hard-sm flex h-8 w-8 shrink-0 items-center justify-center border-2 border-ink bg-paper"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <div className="px-4 pt-4">
            <div className="rounded-md border-2 border-mustard bg-white p-3">
              {inicial.curtidas === 0 && inicial.comentarios.length === 0 && (
                <p className="mb-1 font-serif text-sm italic text-ink-soft">Ainda ninguém comentou.</p>
              )}
              <RodapeCartao itemId={itemId} chave={chave} inicial={inicial} />
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}
