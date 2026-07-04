"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { createMediaItem, searchBookCovers, type CoverCandidate } from "@/app/actions/media-items";
import { IllustratedCover } from "@/components/illustrated-cover";
import { paletteIndexForTitle } from "@/lib/covers";

const STATUS_OPTIONS = [
  { value: "want", label: "quero ler" },
  { value: "reading", label: "lendo" },
  { value: "finished", label: "terminei" },
  { value: "abandoned", label: "abandonei" },
];

export function AddBookForm({ serverError }: { serverError?: string }) {
  const [title, setTitle] = useState("");
  const [creator, setCreator] = useState("");
  const [coverKind, setCoverKind] = useState<"real" | "illustrated">("real");
  const [candidates, setCandidates] = useState<CoverCandidate[]>([]);
  const [searched, setSearched] = useState(false);
  const [isSearching, startSearch] = useTransition();

  function handleSearch() {
    startSearch(async () => {
      const query = [title, creator].filter(Boolean).join(" ");
      const result = await searchBookCovers(query);
      setCandidates(result);
      setSearched(true);
    });
  }

  return (
    <form action={createMediaItem} className="flex flex-col gap-4">
      {serverError && (
        <p className="text-sm font-medium text-coral">{serverError}</p>
      )}

      <label className="flex flex-col gap-1 text-sm font-medium">
        Título
        <input
          name="title"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Nome do livro"
          className="rounded border-2 border-ink bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-moss-dark"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium">
        Autor <span className="font-normal text-ink/60">(opcional)</span>
        <input
          name="creator"
          value={creator}
          onChange={(e) => setCreator(e.target.value)}
          placeholder="Nome do autor"
          className="rounded border-2 border-ink bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-moss-dark"
        />
      </label>

      <div>
        <span className="mb-1 block text-sm font-medium">Capa</span>
        <div className="flex overflow-hidden rounded-md border-2 border-ink">
          <label className="flex-1">
            <input
              type="radio"
              name="cover_kind"
              value="real"
              checked={coverKind === "real"}
              onChange={() => setCoverKind("real")}
              className="peer sr-only"
            />
            <span className="block cursor-pointer border-r-2 border-ink bg-white px-3 py-2 text-center text-sm font-medium peer-checked:bg-moss-dark peer-checked:text-paper">
              Capa real
            </span>
          </label>
          <label className="flex-1">
            <input
              type="radio"
              name="cover_kind"
              value="illustrated"
              checked={coverKind === "illustrated"}
              onChange={() => setCoverKind("illustrated")}
              className="peer sr-only"
            />
            <span className="block cursor-pointer bg-white px-3 py-2 text-center text-sm font-medium peer-checked:bg-moss-dark peer-checked:text-paper">
              Ilustração Quill
            </span>
          </label>
        </div>
      </div>

      {coverKind === "real" ? (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={handleSearch}
            disabled={!title.trim() || isSearching}
            className="self-start rounded-md border-2 border-ink bg-white px-3 py-1.5 text-sm font-medium disabled:opacity-50"
          >
            {isSearching ? "Buscando…" : "Buscar capa"}
          </button>

          {searched && !isSearching && candidates.length === 0 && (
            <p className="text-sm text-ink/60">
              Nenhuma capa encontrada — pode usar a ilustração Quill.
            </p>
          )}

          {candidates.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1" role="radiogroup" aria-label="Capas encontradas">
              {candidates.map((c, i) => (
                <label key={c.id} className="shrink-0">
                  <input
                    type="radio"
                    name="cover_url"
                    value={c.largeUrl}
                    defaultChecked={i === 0}
                    className="peer sr-only"
                  />
                  <Image
                    src={c.thumbUrl}
                    alt={`${c.title}${c.author ? ` — ${c.author}` : ""}`}
                    width={56}
                    height={84}
                    className="cursor-pointer rounded border-2 border-ink/30 object-cover peer-checked:border-moss-dark peer-checked:shadow-hard-sm"
                  />
                </label>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="mx-auto h-[150px] w-[100px]">
          <IllustratedCover
            title={title || "Título"}
            paletteIndex={paletteIndexForTitle(title || "q")}
          />
        </div>
      )}

      <label className="flex flex-col gap-1 text-sm font-medium">
        Total de páginas <span className="font-normal text-ink/60">(opcional)</span>
        <input
          type="number"
          name="total_units"
          placeholder="0"
          className="rounded border-2 border-ink bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-moss-dark"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Playlist do Spotify <span className="font-normal text-ink/60">(opcional)</span>
        <input
          name="spotify_url"
          placeholder="Link da playlist"
          className="rounded border-2 border-ink bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-moss-dark"
        />
      </label>

      <fieldset>
        <legend className="mb-1 text-sm font-medium">Status</legend>
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((opt) => (
            <label key={opt.value}>
              <input
                type="radio"
                name="status"
                value={opt.value}
                defaultChecked={opt.value === "reading"}
                className="peer sr-only"
              />
              <span className="block cursor-pointer rounded-full border-2 border-ink bg-white px-3 py-1.5 text-xs font-medium peer-checked:bg-mustard">
                {opt.label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <button
        type="submit"
        className="mt-2 rounded-md bg-moss-dark px-4 py-3 font-display text-sm text-paper shadow-hard-sm"
      >
        Adicionar à estante
      </button>
    </form>
  );
}
