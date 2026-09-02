"use client";

import { useState, useTransition } from "react";
import { addFriendBookToShelf } from "@/app/actions/media-items";

/**
 * "+ minha estante" para um livro que está na estante de um amigo.
 *
 * Vive num componente próprio porque os livros dos amigos aparecem em três
 * lugares — a aba Amigos da estante, o diálogo de amigos no perfil e a página
 * do livro — e o botão tinha ficado só num deles.
 *
 * O livro entra sem status escolhido (ver `addFriendBookToShelf`): quem está
 * olhando a estante de outra pessoa não tem essa decisão tomada.
 */
export function BotaoAddLivroAmigo({ itemId }: { itemId: string }) {
  const [estado, setEstado] = useState<"idle" | "feito" | "ja-tinha">("idle");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  if (estado !== "idle") {
    return (
      <p className="font-display text-[10px] uppercase tracking-wider text-moss-dark">
        {estado === "feito" ? "✓ na sua estante" : "já estava na sua estante"}
      </p>
    );
  }

  return (
    <>
      <button
        type="button"
        disabled={pendente}
        onClick={() => {
          setErro(null);
          iniciar(async () => {
            const r = await addFriendBookToShelf({ sourceItemId: itemId });
            // "já está na sua estante" vem com itemId: é aviso, não falha.
            if (r.error && !r.itemId) {
              setErro(r.error);
              return;
            }
            setEstado(r.error ? "ja-tinha" : "feito");
          });
        }}
        className="shadow-hard-sm rounded-md border-2 border-ink bg-coral px-2.5 py-1 font-display text-[10px] uppercase tracking-wider text-paper active:translate-x-[1px] active:translate-y-[1px] active:shadow-none disabled:opacity-60"
      >
        {pendente ? "Adicionando…" : "+ minha estante"}
      </button>
      {erro && <p className="mt-1 text-[11px] font-medium text-coral">{erro}</p>}
    </>
  );
}
