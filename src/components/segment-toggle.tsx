type Option<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  value: T;
  onChange: (v: T) => void;
  options: Option<T>[];
  ariaLabel?: string;
};

export function SegmentToggle<T extends string>({ value, onChange, options, ariaLabel }: Props<T>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="inline-flex rounded-full border-2 border-ink bg-paper p-0.5 shadow-hard-sm"
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
              active ? "bg-navy text-paper" : "text-ink-soft"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
