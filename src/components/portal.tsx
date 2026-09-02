"use client";

import { createPortal } from "react-dom";

/**
 * Manda o conteúdo pro fim do <body>.
 *
 * Existe por causa de empilhamento: um modal declarado dentro de um cabeçalho
 * `sticky z-10` fica preso no contexto dele, e aí o `z-40` do modal vale 10 —
 * a tab bar (z-20) passa por cima e corta o modal ao meio. No body ele volta a
 * disputar de igual pra igual com o resto da tela.
 *
 * Renderize só quando o modal estiver aberto (`{aberto && <Portal>…`): assim
 * no servidor nada disto roda e o `document` nunca é tocado lá.
 */
export function Portal({ children }: { children: React.ReactNode }) {
  if (typeof document === "undefined") return null;
  return createPortal(children, document.body);
}
