import type { Livro } from "./types";

export type MembroDesafio = {
  id: string;
  inicial: string;
  cor: "coral" | "moss" | "mustard" | "navy" | "cover-1" | "cover-2" | "cover-3" | "cover-4";
};

export type Desafio = {
  id: string;
  nome: string;
  emoji: string;
  tipo: "livro_unico" | "livro_livre";
  livro?: Pick<Livro, "titulo" | "cover_kind" | "cover_url" | "cover_palette">;
  clube: string; // subtítulo curto
  diasTotais: number;
  diasDecorridos: number;
  minhaPosicao: number;
  totalMembros: number;
  ultimaAtividade: string; // ex: "Maria fez check-in há 2h"
  membros: MembroDesafio[];
  acentoSombra: "navy" | "moss" | "mustard" | "coral";
  acentoCapa: "mustard" | "navy" | "coral" | "moss";
  acentoBarra: "moss" | "coral" | "mustard" | "navy";
  destaqueTexto?: string; // "Lendo agora" | "Inicia em 3 dias" | undefined
  cta?: "participar" | null;
};

export type DesafioEncerrado = {
  id: string;
  nome: string;
  emoji: string;
  vencedor: string;
  recap: string; // "12 livros · 3 semanas"
};

export const desafiosAtivos: Desafio[] = [
  {
    id: "iluminado",
    nome: "O Iluminado",
    emoji: "👻",
    tipo: "livro_unico",
    livro: { titulo: "O Iluminado", cover_kind: "illustrated", cover_palette: "cover-4" },
    clube: "Clube do Terror",
    diasTotais: 21,
    diasDecorridos: 13,
    minhaPosicao: 2,
    totalMembros: 11,
    ultimaAtividade: "Maria fez check-in há 2h",
    membros: [
      { id: "ab", inicial: "AB", cor: "mustard" },
      { id: "rt", inicial: "RT", cor: "moss" },
      { id: "+8", inicial: "+8", cor: "coral" },
    ],
    acentoSombra: "navy",
    acentoCapa: "mustard",
    acentoBarra: "moss",
    destaqueTexto: "Lendo agora",
  },
  {
    id: "redoma",
    nome: "A Redoma de Vidro",
    emoji: "🫧",
    tipo: "livro_unico",
    livro: { titulo: "A Redoma de Vidro", cover_kind: "illustrated", cover_palette: "cover-2" },
    clube: "Clássicos Modernos",
    diasTotais: 14,
    diasDecorridos: 0,
    minhaPosicao: 0,
    totalMembros: 6,
    ultimaAtividade: "Ainda não começou",
    membros: [
      { id: "cf", inicial: "CF", cor: "coral" },
      { id: "lm", inicial: "LM", cor: "navy" },
    ],
    acentoSombra: "moss",
    acentoCapa: "navy",
    acentoBarra: "mustard",
    destaqueTexto: "Inicia em 3 dias",
    cta: "participar",
  },
  {
    id: "dom-casmurro",
    nome: "Dom Casmurro",
    emoji: "☕",
    tipo: "livro_unico",
    livro: { titulo: "Dom Casmurro", cover_kind: "illustrated", cover_palette: "cover-1" },
    clube: "Literatura Brasileira",
    diasTotais: 28,
    diasDecorridos: 4,
    minhaPosicao: 5,
    totalMembros: 27,
    ultimaAtividade: "Rafa comentou há 1d",
    membros: [
      { id: "js", inicial: "JS", cor: "cover-3" },
      { id: "ma", inicial: "MA", cor: "navy" },
      { id: "+24", inicial: "+24", cor: "cover-1" },
    ],
    acentoSombra: "mustard",
    acentoCapa: "coral",
    acentoBarra: "coral",
    destaqueTexto: undefined,
  },
];

export const desafiosEncerrados: DesafioEncerrado[] = [
  {
    id: "junho-noir",
    nome: "Junho Noir",
    emoji: "🕵️",
    vencedor: "Bia",
    recap: "5 livros · 30 dias",
  },
];
