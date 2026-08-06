"use client";

import { useEffect, useState } from "react";

type Gif = { id: string; title: string; preview: string; full: string };

// Seletor de GIF via proxy /api/giphy (a key fica no servidor). Debounce na
// busca; sem termo mostra os em alta.
export function GifPicker({
  onSelect,
  onClose,
}: {
  onSelect: (url: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [gifs, setGifs] = useState<Gif[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const t = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/giphy?q=${encodeURIComponent(query)}`);
        const json = await res.json();
        if (!active) return;
        if (!res.ok) {
          setError(json.error ?? "Não foi possível buscar GIFs");
          setGifs([]);
        } else {
          setGifs(json.gifs ?? []);
        }
      } catch {
        if (active) setError("Não foi possível buscar GIFs");
      } finally {
        if (active) setLoading(false);
      }
    }, 350);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [query]);

  return (
    <div className="rounded-md border-2 border-ink bg-white p-2">
      <div className="mb-2 flex items-center gap-2">
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar GIF…"
          className="flex-1 rounded border-2 border-ink bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-moss-dark"
        />
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar seletor de GIF"
          className="rounded border-2 border-cover-border px-2 py-1 text-xs text-ink/60"
        >
          ✕
        </button>
      </div>

      {loading && <p className="py-4 text-center text-xs text-ink/55">Carregando…</p>}
      {error && <p className="py-4 text-center text-xs text-coral">{error}</p>}

      {!loading && !error && (
        <div className="grid max-h-52 grid-cols-3 gap-1.5 overflow-y-auto">
          {gifs.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => onSelect(g.full)}
              className="overflow-hidden rounded border border-cover-border"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- GIF externo do Giphy, next/image não otimiza */}
              <img
                src={g.preview}
                alt={g.title}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </button>
          ))}
          {gifs.length === 0 && (
            <p className="col-span-3 py-4 text-center text-xs text-ink/55">
              Nenhum GIF encontrado.
            </p>
          )}
        </div>
      )}
      <p className="mt-1 text-center text-[10px] text-ink/40">via GIPHY</p>
    </div>
  );
}
