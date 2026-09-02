"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { excluirComentario } from "@/app/actions/comments";

export type Nota = {
  id: string;
  content: string | null;
  chapter_ref: number | null;
  scope: string;
  gif_url: string | null;
  is_public: boolean;
};

/**
 * Uma anotação da página do livro, com opção de excluir.
 *
 * A confirmação acontece dentro do próprio card, não num modal: apagar uma nota
 * é pequeno e reversível pela memória de quem escreveu — abrir uma folha por
 * cima da tela cobraria mais atenção do que o ato merece. Mas confirma, porque
 * some pra sempre.
 */
export function NotaItem({ nota, itemId }: { nota: Nota; itemId: string }) {
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [apagando, iniciar] = useTransition();

  function apagar() {
    setErro(null);
    iniciar(async () => {
      const r = await excluirComentario({ id: nota.id, itemId });
      if (r.error) {
        setErro(r.error);
        setConfirmando(false);
        return;
      }
      router.refresh();
    });
  }

  return (
    <li className="border-2 border-ink border-l-8 border-l-navy bg-paper p-4 shadow-hard-sm">
      <div className="mb-2 flex items-center gap-2">
        {nota.scope === "chapter" && nota.chapter_ref != null && (
          <span className="border border-ink bg-mustard px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-ink">
            cap. {nota.chapter_ref}
          </span>
        )}
        <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-soft">
          {nota.is_public ? "🌍 público" : "🔒 privado"}
        </span>
        {!confirmando && (
          <button
            type="button"
            onClick={() => setConfirmando(true)}
            aria-label="Excluir esta nota"
            className="ml-auto shrink-0 rounded px-1.5 py-1 text-ink-soft hover:text-coral"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M4 7h16M10 11v6M14 11v6" />
              <path d="M5 7l1 13h12l1-13M9 7V4h6v3" />
            </svg>
          </button>
        )}
      </div>

      {nota.content && (
        <p className="font-serif text-sm leading-relaxed text-ink">{nota.content}</p>
      )}
      {nota.gif_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={nota.gif_url}
          alt="GIF"
          className="mt-1.5 max-h-32 border-2 border-cover-border"
        />
      )}

      {erro && <p className="mt-2 text-xs font-medium text-coral">{erro}</p>}

      {confirmando && (
        <div className="mt-3 flex items-center gap-2 border-t-2 border-dashed border-ink/30 pt-3">
          <span className="flex-1 text-xs text-ink-soft">Apagar esta nota?</span>
          <button
            type="button"
            onClick={() => setConfirmando(false)}
            disabled={apagando}
            className="shadow-hard-sm rounded-md border-2 border-ink bg-card px-2.5 py-1.5 font-display text-[10px] uppercase tracking-wider active:translate-x-[1px] active:translate-y-[1px] active:shadow-none disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={apagar}
            disabled={apagando}
            className="shadow-hard-sm rounded-md border-2 border-ink bg-coral px-2.5 py-1.5 font-display text-[10px] uppercase tracking-wider text-paper active:translate-x-[1px] active:translate-y-[1px] active:shadow-none disabled:opacity-60"
          >
            {apagando ? "Apagando…" : "Apagar"}
          </button>
        </div>
      )}
    </li>
  );
}
