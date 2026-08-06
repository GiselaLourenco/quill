"use client";

// Estrelas de nota (0–5), portado do Lovable. Interativo quando recebe onChange;
// clicar na mesma estrela zera (toggle). Só leitura quando onChange é omitido.
type Props = {
  value: number; // 0..5
  onChange?: (v: number) => void;
  size?: "sm" | "md" | "lg";
  label?: string;
};

const SIZE: Record<NonNullable<Props["size"]>, string> = {
  sm: "text-xs",
  md: "text-base",
  lg: "text-2xl",
};

export function StarRating({ value, onChange, size = "sm", label }: Props) {
  const interactive = !!onChange;
  return (
    <div
      className={`inline-flex items-center gap-0.5 leading-none ${SIZE[size]}`}
      role={interactive ? "radiogroup" : undefined}
      aria-label={label ?? `Nota: ${value} de 5`}
    >
      {[1, 2, 3, 4, 5].map((i) => {
        const filled = i <= value;
        const star = <span className={filled ? "text-mustard" : "text-ink-soft/30"}>★</span>;
        if (!interactive) return <span key={i}>{star}</span>;
        return (
          <button
            key={i}
            type="button"
            aria-label={`${i} estrela${i > 1 ? "s" : ""}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onChange(value === i ? 0 : i);
            }}
            className="px-0.5"
          >
            {star}
          </button>
        );
      })}
    </div>
  );
}
