"use client";

import { useState, useTransition } from "react";
import imageCompression from "browser-image-compression";
import { createClient } from "@/lib/supabase/client";

type ActiveChallenge = { id: string; name: string; emoji: string | null };

export function CheckinSection({ challenges }: { challenges: ActiveChallenge[] }) {
  const [enabled, setEnabled] = useState(false);
  const [groupId, setGroupId] = useState(challenges[0]?.id ?? "");
  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isUploading, startUpload] = useTransition();

  if (challenges.length === 0) return null;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !groupId) return;

    startUpload(async () => {
      try {
        const compressed = await imageCompression(file, {
          maxSizeMB: 0.6,
          maxWidthOrHeight: 1600,
        });
        const path = `${groupId}/${crypto.randomUUID()}.jpg`;
        const supabase = createClient();
        const { error } = await supabase.storage
          .from("challenge-photos")
          .upload(path, compressed, { contentType: "image/jpeg" });

        if (!error) {
          setPhotoPath(path);
          setPreview(URL.createObjectURL(compressed));
        }
      } catch {
        // foto é opcional — falha silenciosa não bloqueia o check-in
      }
    });
  }

  return (
    <div className="border-t-2 border-cover-border pt-3">
      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="h-4 w-4 accent-moss-dark"
        />
        Publicar como check-in
      </label>

      {enabled && (
        <div className="mt-2 flex flex-col gap-2">
          <input type="hidden" name="checkin_group_id" value={groupId} />
          <input type="hidden" name="checkin_photo_path" value={photoPath ?? ""} />

          {challenges.length > 1 && (
            <select
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              className="rounded border-2 border-ink bg-white px-3 py-2 text-sm"
            >
              {challenges.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.emoji} {c.name}
                </option>
              ))}
            </select>
          )}

          <input
            name="checkin_note"
            placeholder="Comentário (opcional)"
            className="rounded border-2 border-ink bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-moss-dark"
          />

          <label className="text-xs font-medium">
            Foto <span className="font-normal text-ink/60">(opcional)</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="mt-1 block text-xs"
            />
          </label>
          {isUploading && <p className="text-xs text-ink/60">Enviando…</p>}
          {preview && (
            // eslint-disable-next-line @next/next/no-img-element -- blob: preview, next/image não otimiza
            <img
              src={preview}
              alt="Prévia da foto do check-in"
              className="h-20 w-20 rounded object-cover"
            />
          )}
        </div>
      )}
    </div>
  );
}
