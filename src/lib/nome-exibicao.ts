/**
 * Nome que aparece na tela.
 *
 * Ordem: display_name → username → parte local do e-mail. O display_name
 * preenchido sempre vence; a exceção são as contas criadas antes do campo de
 * username no cadastro, que têm `display_name` igual ao e-mail — nesse caso o
 * username vem primeiro, porque mostrar o endereço vazaria o e-mail para
 * amigos. Sem username, sobra a parte local do e-mail.
 */
export function nomeExibicao(
  displayName: string | null | undefined,
  username: string | null | undefined,
): string {
  const nome = displayName?.trim();
  const user = username?.trim();

  if (nome && !nome.includes("@")) return nome;
  if (user) return user;
  if (!nome) return "Leitor";
  return nome.split("@")[0]!;
}
