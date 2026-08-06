"use client";

import { useState, useTransition } from "react";
import { createComment } from "@/app/actions/comments";
import { GifPicker } from "@/components/gif-picker";

// Compositor de comentário: nível (livro/capítulo), texto, GIF e visibilidade
// (🔒 só eu = padrão · 🌍 amigos). "Passagem" é backlog (dependia de foto).
export function CommentComposer({ itemId }: { itemId: string }) {
  const [scope, setScope] = useState<"item" | "chapter">("item");
  const [chapter, setChapter] = useState("");
  const [content, setContent] = useState("");
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState(false);
  const [showGif, setShowGif] = useState(false);
  const [isSaving, startSave] = useTransition();

  const canSend = content.trim().length > 0 || gifUrl != null;

  function reset() {
    setContent("");
    setGifUrl(null);
    setChapter("");
    setScope("item");
    setShowGif(false);
    setIsPublic(false); // volta pro padrão "só eu" — evita público acidental
  }

  function submit() {
    if (!canSend) return;
    startSave(async () => {
      await createComment({
        itemId,
        content,
        scope,
        chapterRef: scope === "chapter" ? Number(chapter) : null,
        gifUrl,
        isPublic,
      });
      reset();
    });
  }

  return (
    <div className="rounded-md border-2 border-ink bg-white p-3">
      <div className="mb-2 flex gap-2">
        {(["item", "chapter"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setScope(s)}
            className={`rounded-full border-2 border-ink px-3 py-0.5 text-xs font-medium ${
              scope === s ? "bg-moss-dark text-paper" : "bg-white"
            }`}
          >
            {s === "item" ? "livro" : "capítulo"}
          </button>
        ))}
      </div>

      {scope === "chapter" && (
        <input
          type="number"
          min={1}
          value={chapter}
          onChange={(e) => setChapter(e.target.value)}
          placeholder="nº do capítulo"
          className="mb-2 block w-full rounded border-2 border-ink bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-moss-dark"
        />
      )}

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Escrever um comentário"
        rows={2}
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

      {showGif && !gifUrl && (
        <div className="mt-2">
          <GifPicker
            onSelect={(url) => {
              setGifUrl(url);
              setShowGif(false);
            }}
            onClose={() => setShowGif(false)}
          />
        </div>
      )}

      <div className="mt-2 flex items-center gap-2">
        {!gifUrl && (
          <button
            type="button"
            onClick={() => setShowGif((v) => !v)}
            className="rounded border-2 border-ink bg-white px-2.5 py-1 text-xs font-semibold"
          >
            GIF
          </button>
        )}

        <button
          type="button"
          role="switch"
          aria-checked={isPublic}
          aria-label={isPublic ? "Visível para amigos" : "Só você"}
          onClick={() => setIsPublic((v) => !v)}
          className="rounded-full border-2 border-ink bg-paper px-2.5 py-1 text-xs"
        >
          {isPublic ? "🌍 amigos" : "🔒 só eu"}
        </button>

        <button
          type="button"
          onClick={submit}
          disabled={!canSend || isSaving}
          className="ml-auto rounded border-2 border-ink bg-moss-dark px-4 py-1.5 text-sm font-medium text-paper disabled:opacity-50"
        >
          {isSaving ? "…" : "Enviar"}
        </button>
      </div>
    </div>
  );
}
