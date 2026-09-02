/**
 * Catálogo dos pontos fixos de imagem do app.
 *
 * Cada ponto tem um id estável (`home.avatar`) porque a mesma arte aparece em
 * vários lugares e cada lugar pode querer outra arte / outro enquadramento.
 * Este arquivo existe para dar nome humano a esses ids: o lápis mostra o
 * rótulo, não `home.meta-anel`.
 *
 * Slots dinâmicos (uma conquista, uma fase do Quill) não entram na lista — o
 * rótulo cai no próprio id, que já é legível.
 */
export const ROTULOS_SLOT: Record<string, string> = {
  "perfil.lore": "Perfil — a história do Quill",
  "app.favicon": "Ícone do app (favicon)",
  "login.mascote": "Mascote do login",
  "home.avatar": "Avatar da home",
  "home.meta-anel": "Anel de meta — em progresso",
  "home.meta-anel-completa": "Anel de meta — batida",
  "home.desafios-vazio": "Home — sem desafios",
  "estante.hero": "Estante — destaque do topo",
  "diario.vazio": "Diário — sem anotações",
  "indicar.estante-vazia": "Indicar — estante vazia",
  "ler.cena": "Ler — mascote da sessão",
  "ler.resumo-timer": "Ler — resumo por timer",
  "ler.resumo-manual": "Ler — resumo manual",
  "ler.fim": "Ler — sessão salva",
  "perfil.meta-ano": "Perfil — meta do ano",
  "perfil.badges": "Perfil — ao lado das conquistas",
  "perfil.amigos-vazio": "Perfil — sem amigos",
  "perfil.rankings-vazio": "Perfil — sem desafios no ranking",
  "vazio.lendo": "Estado vazio — lendo",
  "vazio.escrevendo": "Estado vazio — escrevendo",
  "vazio.confiante": "Estado vazio — confiante",
  "vazio.comemorando": "Estado vazio — comemorando",
};

/**
 * Pontos que o lápis não alcança porque a tela não tem admin logado (login) ou
 * nem imagem na tela é (favicon). Ficam no /admin.
 */
export const SLOTS_FORA_DO_APP = [
  {
    slot: "app.favicon",
    rotulo: ROTULOS_SLOT["app.favicon"],
    // Miniatura do /admin: tem que ser a mesma arte que a rota do ícone usa
    // por padrão, senão o admin vê um desenho e o app mostra outro.
    padrao: "/img/app/icone.svg",
    enquadra: false,
  },
  {
    slot: "login.mascote",
    rotulo: ROTULOS_SLOT["login.mascote"],
    padrao: "/img/mascot/quill-confiante.webp",
    enquadra: true,
  },
] as const;

export function rotuloDoSlot(slot: string): string {
  return ROTULOS_SLOT[slot] ?? slot;
}
