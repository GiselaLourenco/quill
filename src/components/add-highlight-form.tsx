"use client";

import { useState, useTransition } from "react";
import imageCompression from "browser-image-compression";
import { createClient } from "@/lib/supabase/client";
import { createHighlight } from "@/app/actions/highlights";

export function AddHighlightForm({
  itemId,
  userId,
}: {
  itemId: string;
  userId: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, startUpload] = useTransition();

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    startUpload(async () => {
      try {
        const compressed = await imageCompression(file, {
          maxSizeMB: 0.6,
          maxWidthOrHeight: 1600,
        });
        const path = `${userId}/${crypto.randomUUID()}.jpg`;
        const supabase = createClient();
        const { error: uploadError } = await supabase.storage
          .from("highlights")
          .upload(path, compressed, { contentType: "image/jpeg" });

        if (uploadError) {
          setError("Não foi possível enviar a foto.");
          return;
        }

        setImagePath(path);
        setPreview(URL.createObjectURL(compressed));
      } catch {
        setError("Não foi possível processar a imagem.");
      }
    });
  }

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        aria-label="Adicionar trecho favorito"
        className="flex h-[52px] w-[52px] items-center justify-center rounded-md border-2 border-dashed border-cover-border text-lg"
      >
        +
      </button>
    );
  }

  return (
    <form
      action={createHighlight}
      className="flex w-full flex-col gap-3 rounded-md border-2 border-ink bg-white p-3"
    >
      <input type="hidden" name="item_id" value={itemId} />
      <input type="hidden" name="image_path" value={imagePath ?? ""} />

      <label className="text-sm font-medium">
        Foto do trecho
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="mt-1 block text-sm"
        />
      </label>

      {isUploading && <p className="text-sm text-ink/60">Enviando…</p>}
      {error && <p className="text-sm text-coral">{error}</p>}
      {preview && (
        // eslint-disable-next-line @next/next/no-img-element -- blob: preview, next/image não otimiza
        <img
          src={preview}
          alt="Prévia do trecho"
          className="h-24 w-24 rounded object-cover"
        />
      )}

      <label className="text-sm font-medium">
        Página <span className="font-normal text-ink/60">(opcional)</span>
        <input
          type="number"
          name="unit_ref"
          className="mt-1 block w-full rounded border-2 border-ink bg-white px-2 py-1 text-sm"
        />
      </label>
      <label className="text-sm font-medium">
        Nota <span className="font-normal text-ink/60">(opcional)</span>
        <input
          name="note"
          className="mt-1 block w-full rounded border-2 border-ink bg-white px-2 py-1 text-sm"
        />
      </label>

      <button
        type="submit"
        disabled={!imagePath || isUploading}
        className="rounded-md border-2 border-ink bg-moss-dark px-3 py-2 text-sm font-medium text-paper disabled:opacity-50"
      >
        Salvar trecho
      </button>
    </form>
  );
}
