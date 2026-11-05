// Conta da posição de leitura (aba Ler e check-in do Juntos): a pessoa diz
// onde parou e o app calcula quanto leu — posição nova menos a anterior. É a
// mesma conta que o servidor grava (`createSession`), feita aqui só pra tela
// mostrar o resultado e os avisos antes de salvar.

export type UnidadePosicao = "pages" | "chapters";

/** Pulo improvável: mais que isso de páginas por minuto de sessão… */
export const PULO_PAGINAS_POR_MINUTO = 3;
/** …e mais que isso de páginas — sessão curta de 20 pág não é suspeita. */
export const PULO_MIN_PAGINAS = 50;

export type AlertaPosicao = "menor" | "pulo" | null;

export type AnalisePosicao = {
  /** Posição que vai ser gravada (nunca passa do total do livro). */
  fim: number;
  /** Quanto conta nas métricas — 0 quando volta ou fica na mesma. */
  delta: number;
  alerta: AlertaPosicao;
  /** A posição chega ao total: salvar marca o livro como terminado. */
  terminaLivro: boolean;
};

export function analisarPosicao(input: {
  unidade: UnidadePosicao;
  anterior: number;
  valor: number;
  total: number | null;
  minutos: number;
}): AnalisePosicao {
  const { unidade, anterior, valor, total, minutos } = input;
  const fim = total != null && total > 0 ? Math.min(valor, total) : valor;
  const delta = Math.max(0, fim - anterior);
  let alerta: AlertaPosicao = null;
  if (fim < anterior) alerta = "menor";
  // Só páginas: capítulo varia demais de tamanho pra ter um ritmo "normal".
  else if (
    unidade === "pages" &&
    delta > PULO_MIN_PAGINAS &&
    delta > PULO_PAGINAS_POR_MINUTO * Math.max(1, minutos)
  ) {
    alerta = "pulo";
  }
  return { fim, delta, alerta, terminaLivro: total != null && total > 0 && fim >= total };
}

export function rotuloUnidade(unidade: UnidadePosicao, n: number): string {
  if (unidade === "pages") return n === 1 ? "página" : "páginas";
  return n === 1 ? "capítulo" : "capítulos";
}

export const abrevUnidade = (unidade: UnidadePosicao) => (unidade === "pages" ? "pág." : "cap.");
