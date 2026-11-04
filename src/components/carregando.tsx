"use client";

import type { ButtonHTMLAttributes } from "react";
import { useFormStatus } from "react-dom";

/**
 * Indicador de "carregando" dos botões. Usa a cor do texto do próprio botão
 * (`currentColor`), então funciona igual em botão claro e escuro.
 */
export function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-block h-[1em] w-[1em] shrink-0 animate-spin rounded-full border-2 border-current border-r-transparent align-[-0.125em] ${className}`}
    />
  );
}

/**
 * Conteúdo de botão com spinner: enquanto `ocupado`, o spinner entra antes do
 * texto. O botão continua com o mesmo tamanho e cor — só ganha o giro.
 */
export function ComSpinner({ ocupado, children }: { ocupado: boolean; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center justify-center gap-2">
      {ocupado && <Spinner />}
      {children}
    </span>
  );
}

/**
 * Botão de envio de `<form action={serverAction}>`: lê o status do form pai
 * (`useFormStatus`) e mostra o spinner + trava o clique até a ação terminar
 * — inclusive quando ela termina num `redirect`.
 */
export function BotaoEnviar({
  children,
  textoOcupado,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { textoOcupado?: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending || disabled} aria-busy={pending} {...props}>
      <ComSpinner ocupado={pending}>{pending && textoOcupado ? textoOcupado : children}</ComSpinner>
    </button>
  );
}
