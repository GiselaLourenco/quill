"use client";

import { useState } from "react";
import Image from "next/image";
import { createMediaItem } from "@/app/actions/media-items";
import { BuscaLivro } from "@/components/busca-livro";
import { IllustratedCover } from "@/components/illustrated-cover";
import { paletteIndexForTitle } from "@/lib/covers";
import type { LivroEncontrado } from "@/lib/open-library";

/** Compara títulos ignorando caixa, acento e pontuação. */
function mesmoTitulo(a: string, b: string) {
  const limpar = (t: string) =>
    t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  return limpar(a) === limpar(b);
}

const STATUS_OPTIONS = [
  { value: "want", label: "quero ler" },
  { value: "reading", label: "lendo" },
  { value: "finished", label: "terminei" },
  { value: "abandoned", label: "abandonei" },
];

export function AddBookForm({ serverError }: { serverError?: string }) {
  const [title, setTitle] = useState("");
  const [creator, setCreator] = useState("");
  const [paginas, setPaginas] = useState("");
  const [coverKind, setCoverKind] = useState<"real" | "illustrated">("illustrated");
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [escolhido, setEscolhido] = useState<LivroEncontrado | null>(null);

  function preencherCom(livro: LivroEncontrado) {
    setEscolhido(livro);
    // O título digitado MANDA. A Open Library indexa a obra pelo nome
    // original, então "Harry Potter e a Pedra Filosofal" acha o registro certo
    // mas devolve "Harry Potter and the Philosopher's Stone" — sobrescrever
    // trocaria o nome em português por um em inglês. Só aceitamos o título de
    // lá quando é o mesmo que a pessoa escreveu, aí ganhamos a acentuação e as
    // maiúsculas certas.
    if (mesmoTitulo(title, livro.titulo)) setTitle(livro.titulo);
    if (livro.autor) setCreator(livro.autor);
    if (livro.paginas) setPaginas(String(livro.paginas));
    // Sem capa na Open Library o livro não fica sem capa: cai na ilustração
    // que o app gera a partir do título.
    if (livro.capaGrande) {
      setCoverUrl(livro.capaGrande);
      setCoverKind("real");
    }
  }

  // Editar o título depois de escolher volta a buscar. Sem isto a busca ficava
  // congelada até apertar "buscar de novo", e quem corrigia o nome não via
  // opção nenhuma aparecer.
  function aoDigitarTitulo(valor: string) {
    setTitle(valor);
    if (escolhido && !mesmoTitulo(valor, escolhido.titulo)) setEscolhido(null);
  }

  function voltarABuscar() {
    setEscolhido(null);
    setCoverUrl(null);
    setCoverKind("illustrated");
  }

  return (
    <form action={createMediaItem} className="flex flex-col gap-4">
      {serverError && (
        <p className="text-sm font-medium text-coral">{serverError}</p>
      )}

      <div className="flex flex-col gap-2">
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
        <BuscaLivro
          termo={title}
          escolhido={escolhido}
          onEscolher={preencherCom}
          onLimpar={voltarABuscar}
        />
      </div>

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
