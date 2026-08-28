"use client";

import { AppImage } from "@/components/app-image";
import { useState, useTransition } from "react";
import { BookThumb } from "@/components/book-thumb";
import { type CoverFields } from "@/components/book-cover";
import { recommendBook } from "@/app/actions/recommendations";
import type { Friend } from "@/lib/friends";

export type LivroIndicavel = CoverFields & {
  id: string;
  creator: string | null;
};

const PASSO_LIVROS = 5;

// Fluxo "Indicar um livro a um amigo": escolhe o livro na estante (com busca e
// carregar mais) e depois um ou mais amigos, com mensagem opcional.
export function IndicarSheet({
  livros,
  amigos,
}: {
  livros: LivroIndicavel[];
  amigos: Friend[];
}) {
  const [aberto, setAberto] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="shadow-hard-sm mb-4 flex w-full items-center justify-center gap-2 rounded-md border-2 border-ink bg-mustard px-3 py-2.5 text-sm font-semibold uppercase tracking-wider text-ink active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
      >
        Indicar um livro a um amigo
      </button>

      {aberto && (
        <SheetConteudo livros={livros} amigos={amigos} onFechar={() => setAberto(false)} />
      )}
    </>
  );
}

function SheetConteudo({
  livros,
  amigos,
  onFechar,
}: {
  livros: LivroIndicavel[];
  amigos: Friend[];
  onFechar: () => void;
}) {
  const [etapa, setEtapa] = useState<1 | 2>(1);
  const [livroId, setLivroId] = useState<string | null>(null);
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [mensagem, setMensagem] = useState("");
  const [feito, setFeito] = useState(false);
  const [busca, setBusca] = useState("");
  const [visiveis, setVisiveis] = useState(PASSO_LIVROS);
  const [enviando, startSend] = useTransition();

  const livro = livros.find((l) => l.id === livroId) ?? null;

  const filtrados = livros.filter((l) => {
    const q = busca.trim().toLowerCase();
    if (!q) return true;
    return (
      l.title.toLowerCase().includes(q) || (l.creator ?? "").toLowerCase().includes(q)
    );
  });
  const listaVisivel = filtrados.slice(0, visiveis);

  const toggleAmigo = (id: string) =>
    setSelecionados((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  function enviar() {
    if (!livro || selecionados.length === 0) return;
    startSend(async () => {
      for (const toUserId of selecionados) {
        await recommendBook({
          toUserId,
          itemRef: livro.id,
          title: livro.title,
          message: mensagem.trim() || null,
        });
      }
      setFeito(true);
    });
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-center">
      <button
        type="button"
        aria-label="Fechar"
        onClick={onFechar}
        className="absolute inset-0 bg-ink/40"
      />
      <div className="shadow-hard relative mt-auto max-h-[88dvh] w-full max-w-[390px] overflow-y-auto border-x-2 border-t-2 border-ink bg-paper p-5 pb-8">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-display text-lg uppercase leading-none tracking-tight text-ink">
            {feito ? "Pronto" : etapa === 1 ? "Escolha o livro" : "Para quem?"}
          </h2>
          <button
            type="button"
            onClick={onFechar}
            aria-label="Fechar"
            className="shadow-hard-sm flex h-8 w-8 items-center justify-center border-2 border-ink bg-card font-display text-sm text-ink active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
          >
            ✕
          </button>
        </div>

        {feito ? (
          <div className="py-4 text-center">
            <div className="shadow-hard mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2 border-ink bg-moss font-display text-2xl text-paper">
              ✓
            </div>
            <h3 className="mt-4 font-display text-xl uppercase leading-none tracking-tight text-ink">
              Indicação enviada!
            </h3>
            <p className="mt-2 font-serif text-sm text-ink-soft">
              {selecionados.length === 1
                ? "1 amigo recebeu"
                : `${selecionados.length} amigos receberam`}{" "}
              sua indicação de “{livro?.title}”.
            </p>
            <button
              type="button"
              onClick={onFechar}
              className="shadow-hard mt-6 w-full border-2 border-ink bg-card py-3 font-display text-sm uppercase tracking-wider text-ink active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
            >
              Fechar
            </button>
          </div>
        ) : etapa === 1 ? (
          <>
            <p className="font-serif text-xs italic text-ink-soft">Da sua estante</p>

            <div className="shadow-hard-sm mt-2 flex items-center gap-2 border-2 border-ink bg-card px-3 focus-within:bg-paper">
              <svg
                className="h-4 w-4 shrink-0 text-ink-soft"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                aria-hidden
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              <input
                type="search"
                value={busca}
                onChange={(e) => {
                  setBusca(e.target.value);
                  setVisiveis(PASSO_LIVROS);
                }}
                placeholder="Buscar pelo título ou autor"
                aria-label="Buscar livro"
                className="w-full bg-transparent py-2.5 font-serif text-sm text-ink outline-none placeholder:italic placeholder:text-ink-soft"
              />
            </div>

            {livros.length === 0 ? (
              <div className="mt-4 flex flex-col items-center gap-3 border-2 border-dashed border-ink bg-card p-5 text-center">
                <AppImage
                  slot="indicar.estante-vazia"
                  src="/img/mascot/quill-lendo.webp"
                  alt="Quill esperando livros"
                  width={140}
                  height={80}
                  className="w-28"
                />
                <p className="font-serif text-sm italic text-ink-soft">
                  Sua estante está vazia — adicione um livro para poder indicar.
                </p>
              </div>
            ) : filtrados.length === 0 ? (
              <p className="mt-4 border-2 border-dashed border-ink bg-card p-4 text-center font-serif text-sm italic text-ink-soft">
                Nenhum livro encontrado para “{busca.trim()}”.
              </p>
            ) : (
              <ul className="mt-2 space-y-2">
                {listaVisivel.map((l) => {
                  const ativo = livroId === l.id;
                  return (
                    <li key={l.id}>
                      <button
                        type="button"
                        onClick={() => setLivroId(l.id)}
                        className={`shadow-hard-sm flex w-full items-center gap-3 border-2 border-ink p-2 text-left active:translate-x-[1px] active:translate-y-[1px] active:shadow-none ${
                          ativo ? "bg-mustard" : "bg-card"
                        }`}
                      >
                        <BookThumb item={l} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-serif text-sm font-bold text-ink">
                            {l.title}
                          </span>
                          <span className="block truncate font-serif text-xs italic text-ink-soft">
                            {l.creator ?? "sem autor"}
                          </span>
                        </span>
                        {ativo && <span className="font-display text-sm text-ink">✓</span>}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {filtrados.length > visiveis && (
              <button
                type="button"
                onClick={() => setVisiveis((v) => v + PASSO_LIVROS)}
                className="shadow-hard-sm mt-3 w-full border-2 border-ink bg-card py-2.5 font-display text-xs uppercase tracking-wider text-ink active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
              >
                Carregar mais ({filtrados.length - visiveis})
              </button>
            )}
            <button
              type="button"
              disabled={!livroId}
              onClick={() => setEtapa(2)}
              className="shadow-hard mt-6 w-full border-2 border-ink bg-coral py-3 font-display text-sm uppercase tracking-wider text-paper active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-40 disabled:shadow-none"
            >
              Continuar
            </button>
          </>
        ) : (
          <>
            {livro && (
              <div className="shadow-hard-sm flex items-center gap-3 border-2 border-ink bg-card p-3">
                <BookThumb item={livro} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-serif text-sm font-bold text-ink">{livro.title}</p>
                  <p className="truncate font-serif text-xs italic text-ink-soft">
                    {livro.creator ?? "sem autor"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEtapa(1)}
                  className="shrink-0 border-2 border-ink bg-paper px-2 py-1 font-display text-[10px] uppercase tracking-wider text-ink"
                >
                  Trocar
                </button>
              </div>
            )}

            <p className="mt-5 font-display text-xs uppercase tracking-wider text-ink">Amigos</p>
            {amigos.length === 0 ? (
              <p className="mt-2 border-2 border-dashed border-ink bg-card p-4 text-center font-serif text-sm italic text-ink-soft">
                Você ainda não tem amigos para indicar.
              </p>
            ) : (
              <ul className="mt-2 space-y-2">
                {amigos.map((a) => {
                  const ativo = selecionados.includes(a.id);
                  return (
                    <li key={a.id}>
                      <button
                        type="button"
                        onClick={() => toggleAmigo(a.id)}
                        className={`shadow-hard-sm flex w-full items-center gap-3 border-2 border-ink p-2 text-left active:translate-x-[1px] active:translate-y-[1px] active:shadow-none ${
                          ativo ? "bg-mustard" : "bg-card"
                        }`}
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-navy font-display text-sm text-paper">
                          {a.name.charAt(0).toUpperCase()}
                        </span>
                        <span className="min-w-0 flex-1 truncate font-display text-xs uppercase tracking-wider text-ink">
                          {a.name}
                        </span>
                        <span className="font-display text-sm text-ink">{ativo ? "✓" : "+"}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            <label
              className="mt-5 block font-display text-xs uppercase tracking-wider text-ink"
              htmlFor="msg-indicacao"
            >
              Mensagem (opcional)
            </label>
            <textarea
              id="msg-indicacao"
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              rows={3}
              placeholder="Por que você indica esse livro?"
              className="shadow-hard-sm mt-2 w-full resize-none border-2 border-ink bg-card p-3 font-serif text-sm text-ink outline-none placeholder:text-ink-soft"
            />

            <button
              type="button"
              disabled={selecionados.length === 0 || enviando}
              onClick={enviar}
              className="shadow-hard mt-6 w-full border-2 border-ink bg-coral py-3 font-display text-sm uppercase tracking-wider text-paper active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-40 disabled:shadow-none"
            >
              {enviando
                ? "Enviando…"
                : selecionados.length > 1
                  ? `Indicar para ${selecionados.length} amigos`
                  : "Indicar"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
