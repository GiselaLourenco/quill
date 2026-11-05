"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BookThumb } from "@/components/book-thumb";
import { BotaoAddLivroAmigo } from "@/components/botao-add-livro-amigo";
import { EmptyState } from "@/components/empty-state";
import { EstanteShelf, type DbStatus, type ShelfBook } from "@/components/estante-shelf";
import { Portal } from "@/components/portal";
import type { FriendItem } from "@/lib/friends";

export function DialogShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-lg uppercase">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="shadow-hard-sm flex h-8 w-8 items-center justify-center rounded-md border-2 border-ink bg-card font-bold text-ink active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
        >
          ×
        </button>
      </div>
      {children}
    </div>
  );
}

/**
 * Qual amigo está aberto (e se na estante completa) mora na URL — `?amigo=…`
 * e `&grade=1` —, não em estado do React. Assim, abrir um livro e voltar
 * devolve a pessoa exatamente onde estava, em vez do feed ou do Perfil zerados.
 * `replaceState` pra não empilhar uma entrada no histórico a cada toque.
 */
export function useAmigoNaUrl() {
  const params = useSearchParams();
  const amigoId = params.get("amigo");
  const grade = !!amigoId && params.get("grade") === "1";
  const definir = (id: string | null, comGrade = false) => {
    const url = new URL(window.location.href);
    if (id) url.searchParams.set("amigo", id);
    else url.searchParams.delete("amigo");
    if (id && comGrade) url.searchParams.set("grade", "1");
    else url.searchParams.delete("grade");
    window.history.replaceState(null, "", url);
  };
  return { amigoId, grade, definir };
}

const STATUS_AMIGO: Record<string, string> = {
  want: "quero ler",
  reading: "lendo",
  finished: "terminei",
  abandoned: "abandonei",
  platinum: "platinei",
};

/**
 * Perfil de um amigo: cabeçalho, "Ver estante completa" e a lista de livros.
 * Um componente só para os dois caminhos — Perfil › Amigos e Estante › Amigos
 * (tocar no nome no feed) — pra que fiquem sempre iguais.
 */
export function PerfilAmigo({
  nome,
  livros,
  grade: modoGrade,
  onGrade: setModoGrade,
  onVoltar,
  voltarLabel = "Amigos",
  onClose,
}: {
  nome: string;
  livros: FriendItem[];
  /** Estante completa aberta (tela cheia) — controlado pela URL. */
  grade: boolean;
  onGrade: (grade: boolean) => void;
  /** Botão "‹ Amigos" acima do cabeçalho. */
  onVoltar: () => void;
  voltarLabel?: string;
  onClose: () => void;
}) {
  if (modoGrade) {
    // Mesma estante que a sua — grade, busca, filtros, paginação, % de
    // progresso — só travada pra leitura (sem editar nota, sem "adicionar
    // livro", sem guardar filtro/busca de uma visita anterior).
    const livrosParaEstante: ShelfBook[] = livros.map((l) => ({
      id: l.id,
      title: l.title,
      creator: l.creator,
      cover_kind: l.cover_kind,
      cover_url: l.cover_url,
      cover_palette: l.cover_palette,
      status: l.status as DbStatus,
      recomendado: l.is_recommended,
      stars: l.stars ?? 0,
      total_units: l.total_units,
      percent_lido: l.percent_lido,
      paginas_lidas: l.paginas_lidas,
    }));
    // Tela toda, não modal — a caixinha de 85vh do diálogo apertava demais
    // uma estante inteira (busca, filtros, grade). Portal pra escapar do
    // pano de fundo do diálogo (z-50) e da própria tab bar (z-20).
    return (
      <Portal>
        <div className="fixed inset-0 z-[60] flex flex-col overflow-y-auto bg-paper">
          <header className="sticky top-0 z-10 flex items-center gap-3 border-b-2 border-ink bg-paper px-4 py-3">
            <button
              type="button"
              onClick={() => setModoGrade(false)}
              aria-label={`Voltar para o perfil de ${nome}`}
              className="shadow-hard-sm flex h-9 w-9 shrink-0 items-center justify-center rounded-md border-2 border-ink bg-card text-ink active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
            >
              ‹
            </button>
            <h1 className="min-w-0 truncate font-display text-lg uppercase leading-none tracking-tight text-ink">
              Estante de {nome}
            </h1>
          </header>
          <EstanteShelf books={livrosParaEstante} readOnly ownerName={nome} />
        </div>
      </Portal>
    );
  }

  return (
    <DialogShell title="Perfil do amigo" onClose={onClose}>
      <button
        type="button"
        onClick={onVoltar}
        className="shadow-hard-sm mb-3 rounded-md border-2 border-ink bg-paper px-3 py-1 text-xs font-bold uppercase active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
      >
        ‹ {voltarLabel}
      </button>

      <div className="shadow-hard-sm mb-3 flex items-center gap-3 rounded-md border-2 border-ink bg-paper p-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-ink bg-navy">
          <span className="font-display text-xl text-paper">{nome.charAt(0).toUpperCase()}</span>
        </div>
        <div className="min-w-0">
          <p className="truncate font-display text-lg uppercase leading-none">{nome}</p>
          <p className="mt-1 font-serif text-xs italic text-ink-soft">
            {livros.length} {livros.length === 1 ? "livro" : "livros"} na estante
          </p>
        </div>
      </div>

      {livros.length > 0 && (
        <button
          type="button"
          onClick={() => setModoGrade(true)}
          className="shadow-hard-sm mb-3 flex w-full items-center justify-between rounded-md border-2 border-ink bg-navy px-3 py-2.5 font-display text-xs uppercase tracking-widest text-paper active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
        >
          Ver estante completa
          <span>›</span>
        </button>
      )}

      {livros.length === 0 ? (
        <EmptyState
          compacto
          mascote="lendo"
          titulo="Estante vazia"
          texto={`${nome} ainda não adicionou nenhum livro.`}
        />
      ) : (
        <ul className="space-y-3">
          {livros.map((l) => (
            <li key={l.id} className="rounded-md border-2 border-ink bg-paper p-3">
              {/* Mesmo destino que o feed: a página do livro do amigo
                  (com comentários e "adicionar à minha estante"). */}
              <Link href={`/books/${l.id}`} className="flex items-start gap-3">
                <BookThumb item={l} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold uppercase leading-tight">{l.title}</p>
                  {l.creator && (
                    <p className="font-serif text-xs italic text-ink-soft">{l.creator}</p>
                  )}
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-ink-soft">
                    {STATUS_AMIGO[l.status] ?? l.status}
                    {l.progressLabel ? ` · ${l.progressLabel}` : ""}
                    {l.stars ? ` · ${"★".repeat(l.stars)}` : ""}
                  </p>
                </div>
              </Link>
              {/* Fora do link — botão próprio, não pode ficar dentro de outro elemento clicável. */}
              <div className="mt-2">
                <BotaoAddLivroAmigo itemId={l.id} />
              </div>
              {/* Só comentários públicos chegam até aqui (getFriendsShelf filtra) */}
              {l.lastComment && (
                <p className="mt-2 rounded-md border-2 border-ink bg-card p-2 font-serif text-xs italic">
                  {l.lastComment.chapterRef != null && (
                    <span className="not-italic text-ink-soft">cap. {l.lastComment.chapterRef} · </span>
                  )}
                  “{l.lastComment.content}”
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </DialogShell>
  );
}

/**
 * O mesmo modal do Perfil (fundo escuro + caixa de baixo), para abrir o
 * perfil de um amigo a partir de qualquer tela.
 */
export function ModalPerfilAmigo({
  nome,
  livros,
  grade,
  onGrade,
  onClose,
}: {
  nome: string;
  livros: FriendItem[];
  grade: boolean;
  onGrade: (grade: boolean) => void;
  onClose: () => void;
}) {
  return (
    <Portal>
      <div
        className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 px-4 pb-6"
        onClick={onClose}
      >
        <div
          className="shadow-hard max-h-[85vh] w-full max-w-[390px] overflow-y-auto rounded-md border-2 border-ink bg-paper"
          onClick={(e) => e.stopPropagation()}
        >
          <PerfilAmigo
            nome={nome}
            livros={livros}
            grade={grade}
            onGrade={onGrade}
            onVoltar={onClose}
            voltarLabel="Feed"
            onClose={onClose}
          />
        </div>
      </div>
    </Portal>
  );
}
