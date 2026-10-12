"use client";

import { useState } from "react";
import Image from "next/image";
import { createMediaItem } from "@/app/actions/media-items";
import { BuscaLivro } from "@/components/busca-livro";
import { IllustratedCover } from "@/components/illustrated-cover";
import { paletteIndexForTitle } from "@/lib/covers";
import type { LivroEncontrado } from "@/lib/open-library";

const STATUS_OPTIONS = [
  { value: "want", label: "quero ler" },
  { value: "reading", label: "lendo" },
  { value: "finished", label: "terminei" },
  { value: "abandoned", label: "abandonei" },
];

export type BookFormInitial = {
  id: string;
  title: string;
  creator: string | null;
  total_units: number | null;
  total_chapters: number | null;
  spotify_url: string | null;
  cover_kind: string;
  cover_url: string | null;
  genre: string | null;
};

export function AddBookForm({
  serverError,
  action = createMediaItem,
  submitLabel = "Adicionar à estante",
  initial,
}: {
  serverError?: string;
  action?: (formData: FormData) => void | Promise<void>;
  submitLabel?: string;
  /** Presente em modo edição: pré-preenche o formulário e liga o form a `action` com o id do livro. */
  initial?: BookFormInitial;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [creator, setCreator] = useState(initial?.creator ?? "");
  const [genero, setGenero] = useState(initial?.genre ?? "");
  const [paginas, setPaginas] = useState(initial?.total_units ? String(initial.total_units) : "");
  const [coverKind, setCoverKind] = useState<"real" | "illustrated">(
    initial?.cover_kind === "real" ? "real" : "illustrated",
  );
  const [coverUrl, setCoverUrl] = useState<string | null>(initial?.cover_url ?? null);
  // Qual campo tem a lista de sugestões aberta agora — só um por vez, Título
  // ou Autor. Editando aquele campo (ou o outro) sempre reabre a busca dele;
  // escolher um resultado sempre fecha a lista, não importa qual campo abriu.
  // Editando um livro que já tem nome certo, começa fechada.
  const [campoBusca, setCampoBusca] = useState<"title" | "creator" | null>(initial ? null : "title");

  // Escolher um resultado substitui pelo que veio da API — título sempre;
  // autor, páginas e capa quando a API tem esse dado (não apaga o que você já
  // tinha digitado só porque a fonte não trouxe aquele campo). Corrigir
  // título ou autor depois não mexe no resto — ver aoDigitarTitulo/aoDigitarAutor.
  function preencherCom(livro: LivroEncontrado) {
    setCampoBusca(null);
    setTitle(livro.titulo);
    if (livro.autor) setCreator(livro.autor);
    if (livro.paginas) setPaginas(String(livro.paginas));
    if (livro.genero) setGenero(livro.genero);
    if (livro.capaGrande) {
      setCoverUrl(livro.capaGrande);
      setCoverKind("real");
    }
  }

  // Editar o título depois de escolher reabre a busca (dele). Sem isto a
  // lista sumia de vez até apertar "buscar de novo".
  function aoDigitarTitulo(valor: string) {
    setTitle(valor);
    setCampoBusca("title");
  }

  function aoDigitarAutor(valor: string) {
    setCreator(valor);
    setCampoBusca("creator");
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      {initial && <input type="hidden" name="id" value={initial.id} />}
      {serverError && (
        <p className="text-sm font-medium text-coral">{serverError}</p>
      )}

      <div
        className="flex flex-col gap-2"
        onFocus={() => setCampoBusca("title")}
        onBlur={(e) => {
          // Só fecha quando o foco sai do grupo inteiro — senão tocar num
          // resultado fecharia a lista antes do clique registrar.
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
            setCampoBusca((c) => (c === "title" ? null : c));
          }
        }}
      >
        <label className="flex flex-col gap-1 text-sm font-medium">
          Título
          <input
            name="title"
            required
            value={title}
            onChange={(e) => aoDigitarTitulo(e.target.value)}
            placeholder="Nome do livro"
            className="rounded border-2 border-ink bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-moss-dark"
          />
        </label>
        {campoBusca === "title" && (
          <BuscaLivro termo={title} onEscolher={preencherCom} onDispensar={() => setCampoBusca(null)} />
        )}
      </div>

      <div
        className="flex flex-col gap-2"
        onFocus={() => setCampoBusca("creator")}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
            setCampoBusca((c) => (c === "creator" ? null : c));
          }
        }}
      >
        <label className="flex flex-col gap-1 text-sm font-medium">
          Autor <span className="font-normal text-ink/60">(opcional)</span>
          <input
            name="creator"
            value={creator}
            onChange={(e) => aoDigitarAutor(e.target.value)}
            placeholder="Nome do autor"
            className="rounded border-2 border-ink bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-moss-dark"
          />
        </label>
        {campoBusca === "creator" && (
          <BuscaLivro termo={creator} onEscolher={preencherCom} onDispensar={() => setCampoBusca(null)} />
        )}
      </div>

      <label className="flex flex-col gap-1 text-sm font-medium">
        Gênero <span className="font-normal text-ink/60">(opcional)</span>
        <input
          name="genre"
          value={genero}
          onChange={(e) => setGenero(e.target.value)}
          placeholder="Vem sozinho ao escolher um resultado da busca"
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

      {coverKind === "real" && coverUrl ? (
        <div className="flex flex-col items-center gap-1">
          <input type="hidden" name="cover_url" value={coverUrl} />
          <Image
            src={coverUrl}
            alt={`Capa de ${title}`}
            width={100}
            height={150}
            className="h-[150px] w-[100px] rounded border-2 border-ink object-cover"
          />
        </div>
      ) : coverKind === "real" ? (
        <p className="text-sm text-ink/60">
          Escolha um livro na busca acima pra trazer a capa real — ou fique na
          ilustração Quill.
        </p>
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
          value={paginas}
          onChange={(e) => setPaginas(e.target.value)}
          placeholder="0"
          className="rounded border-2 border-ink bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-moss-dark"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Total de capítulos <span className="font-normal text-ink/60">(opcional)</span>
        <input
          type="number"
          name="total_chapters"
          min={1}
          defaultValue={initial?.total_chapters ?? undefined}
          placeholder="0"
          className="rounded border-2 border-ink bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-moss-dark"
        />
      </label>
      <p className="-mt-3 text-xs text-ink/60">
        A busca não traz esse número — sumário não entra em base bibliográfica.
      </p>

      <label className="flex flex-col gap-1 text-sm font-medium">
        Playlist do Spotify <span className="font-normal text-ink/60">(opcional)</span>
        <input
          name="spotify_url"
          defaultValue={initial?.spotify_url ?? undefined}
          placeholder="Link da playlist"
          className="rounded border-2 border-ink bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-moss-dark"
        />
      </label>

      {/* Status já tem editor próprio na página do livro (StatusEditor) —
          repetir aqui só confundiria qual dos dois vale. */}
      {!initial && (
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
      )}

      <button
        type="submit"
        className="mt-2 rounded-md bg-moss-dark px-4 py-3 font-display text-sm text-paper shadow-hard-sm"
      >
        {submitLabel}
      </button>
    </form>
  );
}
