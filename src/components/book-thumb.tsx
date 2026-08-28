import { BookCover, type CoverFields } from "@/components/book-cover";
import { COVER_BOX_CLASS } from "@/lib/covers";

/**
 * Capa do livro no tamanho padrão do app (o mesmo da estante).
 * Use este componente em qualquer lista, sheet ou card — ver `COVER_BOX_CLASS`.
 */
export function BookThumb({
  item,
  className = "",
}: {
  item: CoverFields;
  className?: string;
}) {
  return (
    <div className={`${COVER_BOX_CLASS} ${className}`}>
      <BookCover item={item} />
    </div>
  );
}
