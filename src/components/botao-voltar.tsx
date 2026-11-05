"use client";

import { useRouter } from "next/navigation";

/**
 * Volta pra tela de onde a pessoa veio (feed, perfil do amigo, estante
 * completa…), que guarda na URL o que estava aberto. Sem histórico — link
 * aberto direto ou pelo push — cai no `fallback`.
 */
export function BotaoVoltar({
  fallback,
  className,
  ariaLabel = "Voltar",
  children,
}: {
  fallback: string;
  className?: string;
  ariaLabel?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      className={className}
      onClick={() => {
        if (window.history.length > 1) router.back();
        else router.push(fallback);
      }}
    >
      {children}
    </button>
  );
}
