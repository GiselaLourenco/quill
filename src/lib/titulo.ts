/**
 * Chave pra comparar títulos de livro: sem caixa, sem acento e com espaços
 * normalizados — "O Hobbit", "o hobbit " e "O  HÓBBIT" são o mesmo livro na
 * estante. Usada em toda entrada de livro (formulário, edição, livro de
 * amigo, importação) pra não deixar a mesma obra entrar duas vezes.
 */
export function chaveTitulo(titulo: string): string {
  return titulo
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}
