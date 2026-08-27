type Props = {
  tab: string;
  description: string;
};

/**
 * Placeholder das abas enquanto o conteúdo real não chega.
 * O conteúdo virá tela por tela, seguindo o kit.
 */
export function TabPlaceholder({ tab, description }: Props) {
  return (
    <section className="flex min-h-full flex-col items-start gap-3 px-5 py-8">
      <span className="rounded-full border-2 border-ink bg-mustard px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-ink shadow-hard-sm">
        Aba {tab}
      </span>
      <h1 className="font-display text-3xl leading-tight text-ink">{tab}</h1>
      <p className="max-w-[280px] font-serif text-base text-ink-soft">
        {description}
      </p>
      <p className="mt-4 text-sm text-ink-soft">
        Esqueleto do protótipo — o conteúdo real desta tela vem na próxima mensagem.
      </p>
    </section>
  );
}
