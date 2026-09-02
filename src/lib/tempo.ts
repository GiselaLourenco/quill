/**
 * Tempo de leitura em minutos ou horas.
 *
 * A verdade gravada é sempre minuto — a unidade só muda como o número é
 * mostrado e digitado. A regra mora aqui porque duas telas a usam (o check-in
 * de desafio e o registro de sessão), e elas têm layouts diferentes demais pra
 * compartilhar o componente inteiro.
 */
export type UnidadeTempo = "min" | "h";

export const MAX_MINUTOS = 600;

/** Minutos → o número que aparece no campo, na unidade escolhida. */
export function valorNaUnidade(minutos: number, unidade: UnidadeTempo): number {
  // Uma casa decimal: "1,5 h" é uma forma normal de contar leitura; mais que
  // isso vira precisão falsa.
  return unidade === "h" ? Math.round((minutos / 60) * 10) / 10 : minutos;
}

/** O que foi digitado → minutos, já limitado e arredondado. */
export function minutosDoValor(valor: number, unidade: UnidadeTempo): number {
  const emMinutos = unidade === "h" ? valor * 60 : valor;
  return Math.max(0, Math.min(MAX_MINUTOS, Math.round(emMinutos)));
}

/**
 * Minutos a usar depois de trocar de unidade, quando o valor é um palpite.
 *
 * Ir pra horas com 30 min mostraria "0,5" — número quebrado e nenhum atalho
 * aceso. Cai em 1h, a não ser que o valor já seja hora cheia (120 → 2h), aí
 * descartar o que a pessoa pôs seria pior.
 *
 * NÃO use onde o número pode ter vindo do cronômetro: lá arredondar apaga
 * leitura que aconteceu de verdade, e mostrar "1,5 h" é o certo.
 */
export function minutosAoTrocarUnidade(
  minutos: number,
  nova: UnidadeTempo,
): number {
  // Só sobe o que está abaixo de uma hora — que é onde a conversão fica feia
  // ("0,5"). De uma hora pra cima o valor passa intacto: 90 vira "1,5 h", não
  // 1h, senão a troca de unidade comeria meia hora de leitura.
  if (nova !== "h") return minutos;
  return minutos < 60 ? 60 : minutos;
}
