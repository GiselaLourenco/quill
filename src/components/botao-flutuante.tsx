import Link from "next/link";

/**
 * Botão de ação principal flutuando no canto inferior direito.
 *
 * Saiu dos cabeçalhos: lá era um alvo de ~40px no topo direito, o ponto mais
 * longe do polegar numa tela de celular. Aqui são 56px na diagonal natural da
 * mão. Estante e Juntos usam o mesmo desenho e a mesma posição, pra "adicionar"
 * ser sempre o mesmo gesto.
 *
 * O wrapper repete `max-w-[390px] mx-auto` porque `fixed` se ancora no
 * viewport, não na coluna do app — sem isso o botão descolaria pra beirada da
 * janela no desktop. Ele não recebe toque (`pointer-events-none`); só o botão
 * dentro dele recebe, senão a faixa invisível engoliria cliques na lista.
 */
export function BotaoFlutuante({
  href,
  rotulo,
}: {
  href: string;
  rotulo: string;
}) {
  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-20 mx-auto flex w-full max-w-[390px] justify-end px-4"
      style={{ bottom: "calc(var(--tabbar-h) + 12px)" }}
    >
      <Link
        href={href}
        aria-label={rotulo}
        className="shadow-hard pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full border-2 border-ink bg-coral text-paper transition-transform active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-7 w-7"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          aria-hidden
        >
          <path d="M12 6v12M6 12h12" />
        </svg>
      </Link>
    </div>
  );
}
