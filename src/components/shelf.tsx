import type { ReactNode } from "react";
import { useState } from "react";
import type { StatusLivro } from "@/lib/types";
import { STATUS_META } from "@/lib/mock-estante";

type Props<T> = {
  status?: StatusLivro;
  titulo: string;
  cor?: string;
  count: number;
  items: T[];
  renderItem: (item: T) => ReactNode;
  onAdd?: () => void;
  onVerTodos?: () => void;
  colapsavelPadrao?: boolean;
  emptyLabel?: string;
};

export function Shelf<T>({
  status,
  titulo,
  cor,
  count,
  items,
  renderItem,
  onAdd,
  onVerTodos,
  colapsavelPadrao = false,
  emptyLabel,
}: Props<T>) {
  const [aberto, setAberto] = useState(!colapsavelPadrao);
  const chipBg = cor ?? (status ? STATUS_META[status].corBg : "bg-ink-soft");

  return (
    <section className="border-t-2 border-ink">
      <header
        className="flex items-center justify-between gap-2 px-4 py-2.5 cursor-pointer select-none"
        onClick={() => colapsavelPadrao && setAberto((v) => !v)}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className={`h-3 w-3 rounded-sm border border-ink ${chipBg}`} />
          <h2 className="font-display text-sm uppercase tracking-wide text-ink truncate">
            {titulo}
          </h2>
          <span className="text-xs text-ink-soft">· {count}</span>
        </div>
        {onVerTodos && aberto && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onVerTodos();
            }}
            className="text-[11px] font-semibold text-ink-soft hover:text-ink"
          >
            ver todos ›
          </button>
        )}
        {colapsavelPadrao && (
          <span className="text-xs text-ink-soft">{aberto ? "−" : "+"}</span>
        )}
      </header>

      {aberto && (
        <div className="pb-3">
          {items.length === 0 && !onAdd ? (
            <div className="mx-4 mb-2 rounded-md border-2 border-dashed border-ink-soft px-3 py-4 text-center text-xs text-ink-soft">
              {emptyLabel ?? "Vazio"}
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory px-4 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
              {onAdd && (
                <button
                  type="button"
                  onClick={onAdd}
                  className="snap-start shrink-0 flex h-32 w-20 flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed border-ink-soft text-ink-soft hover:border-ink hover:text-ink"
                  aria-label={`Adicionar em ${titulo}`}
                >
                  <span className="text-2xl leading-none">+</span>
                  <span className="text-[10px] font-semibold uppercase">adicionar</span>
                </button>
              )}
              {items.map((item, i) => (
                <div key={i} className="snap-start shrink-0">
                  {renderItem(item)}
                </div>
              ))}
              {items.length === 0 && onAdd && (
                <div className="self-center text-xs text-ink-soft pr-4">
                  {emptyLabel ?? "Nada aqui ainda"}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
