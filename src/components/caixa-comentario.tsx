"use client";

import { useState, useTransition } from "react";
import { GifPicker } from "@/components/gif-picker";
import { Spinner } from "@/components/carregando";

/**
 * Caixa de comentário curta (texto + GIF + Enviar + cancelar) — a mesma do
 * comentário de livro, sem nível nem visibilidade. Usada no check-in do
 * desafio e no cartão do feed dos amigos.
 */
export function CaixaComentario({
  onEnviar,
  onCancelar,
}: {
  onEnviar: (texto: string, gifUrl: string | null) => Promise<string | null>;
  onCancelar: () => void;
}) {
  const [texto, setTexto] = useState("");
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const [mostrarGif, setMostrarGif] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, startEnvio] = useTransition();
  const podeEnviar = texto.trim().length > 0 || gifUrl != null;

  return (
    <div className="rounded-md border-2 border-ink bg-white p-3">
      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Escrever um comentário"
        rows={2}
        autoFocus
        className="block w-full resize-none rounded border-2 border-ink bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-moss-dark"
      />

      {gifUrl && (
        <div className="relative mt-2 inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element -- GIF externo do Giphy */}
          <img src={gifUrl} alt="GIF escolhido" className="max-h-28 rounded border-2 border-cover-border" />
          <button
            type="button"
            onClick={() => setGifUrl(null)}
            aria-label="Remover GIF"
            className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full border-2 border-ink bg-white text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {mostrarGif && !gifUrl && (
        <div className="mt-2">
          <GifPicker
            onSelect={(url) => {
              setGifUrl(url);
              setMostrarGif(false);
            }}
            onClose={() => setMostrarGif(false)}
          />
        </div>
      )}

      {erro && <p className="mt-2 text-[11px] font-semibold text-coral">{erro}</p>}

      <div className="mt-2 flex items-center gap-2">
        {!gifUrl && (
          <button
            type="button"
            onClick={() => setMostrarGif((v) => !v)}
            className="rounded border-2 border-ink bg-white px-2.5 py-1 text-xs font-semibold"
          >
            GIF
          </button>
        )}
        <button
          type="button"
          onClick={onCancelar}
          className="text-xs font-semibold text-ink-soft underline underline-offset-2"
        >
          cancelar
        </button>
        <button
          type="button"
          disabled={!podeEnviar || enviando}
          onClick={() =>
            startEnvio(async () => {
              setErro(null);
              const e = await onEnviar(texto, gifUrl);
              if (e) setErro(e);
            })
          }
          className="ml-auto rounded border-2 border-ink bg-moss-dark px-4 py-1.5 text-sm font-medium text-paper disabled:opacity-50"
        >
          {enviando ? <Spinner /> : "Enviar"}
        </button>
      </div>
    </div>
  );
}
