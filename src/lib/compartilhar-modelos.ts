/**
 * Modelos de cartaz da tela Compartilhar.
 *
 * O "classico" é o cartaz desenhado em código. Os demais são ilustrações 9:16
 * sem texto em `public/img/compartilhar/modelos/<id>.webp` (941×1672); os
 * textos entram por cima, posicionados pelas áreas abaixo.
 *
 * Áreas em % da imagem: [x, y, largura, altura] a partir do canto superior
 * esquerdo. Pra ajustar, abrir /compartilhar/debug (contorno vermelho em cada
 * área, com dados de exemplo).
 */

export type Area = readonly [x: number, y: number, largura: number, altura: number];

/** Cor do texto: "escura" sobre papel creme, "clara" sobre fundo escuro. */
export type Tinta = "escura" | "clara";

export const COR_TINTA: Record<Tinta, string> = {
  escura: "#2C2C2A",
  clara: "#F5ECD7",
};

type Bloco = { area: Area; tinta: Tinta };

export type ModeloIlustrado = {
  tipo: "ilustrado";
  id: string;
  nome: string;
  paleta: readonly string[];
  titulo: Bloco;
  /** Sem `ano`, o ano vai junto do título. */
  ano?: Bloco;
  /** Ordem: minutos, páginas, dias lidos, horário de ouro. Com 3, sem horário de ouro. */
  stats?: readonly Area[];
  /** Cartões de baixo da trilha: livros terminados, meta do ano, nota média, sequência. */
  extras?: readonly Area[];
  /** Cartão grande. `pautas` = y (%) das linhas desenhadas no papel, se houver. */
  destaque?: Bloco & { pautas?: readonly number[] };
  /** Checklist: os 4 stats em linhas; `caixas` = centro (x, y em %) de cada quadradinho desenhado. */
  statsLista?: Bloco & { caixas: readonly (readonly [number, number])[] };
  livro: Bloco & {
    /** % da largura do cartão ocupada por desenho à esquerda. */
    margemEsq: number;
    /** A arte não tem cartão desenhado ali: desenhar um discreto por baixo do texto. */
    cartao?: boolean;
  };
};

export type ModeloClassico = { tipo: "classico"; id: "classico"; nome: string };

export type ModeloCartaz = ModeloClassico | ModeloIlustrado;

export const MODELO_PADRAO = "classico";

export const MODELOS_CARTAZ: readonly ModeloCartaz[] = [
  { tipo: "classico", id: "classico", nome: "Clássico" },
  {
    tipo: "ilustrado",
    id: "medalhao-real",
    nome: "Medalhão real",
    paleta: ["#4B2A7B", "#E2B34A", "#FDD493"],
    titulo: { area: [23, 5.2, 55.2, 12], tinta: "escura" },
    ano: { area: [33, 43.6, 34, 4], tinta: "clara" },
    stats: [[5.2, 50.3, 43.3, 10], [51.2, 50.2, 43.5, 10.1], [5.2, 62.1, 43.3, 10], [51.2, 62.1, 43.5, 10]],
    // Termina antes das folhas douradas do canto direito.
    livro: { area: [5.1, 75, 81, 18.2], margemEsq: 28.5, tinta: "escura" },
  },
  {
    tipo: "ilustrado",
    id: "mesa-polaroid",
    nome: "Mesa com polaroid",
    paleta: ["#6B3A1E", "#F3E3C3", "#C98A3A"],
    titulo: { area: [56.5, 13.5, 39, 14], tinta: "escura" },
    statsLista: {
      area: [57.5, 31.3, 36, 23.1],
      tinta: "escura",
      caixas: [[55.2, 34.2], [54.3, 40], [53.4, 45.8], [52.2, 51.5]],
    },
    // A caneca invade o canto inferior direito do cartão: texto só até y ~76%.
    livro: { area: [3.1, 59.5, 77.5, 17], margemEsq: 28, tinta: "escura" },
  },
  {
    tipo: "ilustrado",
    id: "medalhao-noturno",
    nome: "Medalhão noturno",
    paleta: ["#2E1A4F", "#E8A867", "#FBE3BE"],
    titulo: { area: [10, 4, 80, 10], tinta: "clara" },
    stats: [[4.1, 18.4, 20.3, 12.4], [75.7, 18.4, 20.2, 12.4], [4.1, 40.3, 22, 13.6], [74, 40.3, 21.9, 13.6]],
    // Moldura só de contorno, interior escuro.
    livro: { area: [10, 58.3, 80, 13], margemEsq: 0, tinta: "clara" },
  },
  {
    tipo: "ilustrado",
    id: "trilha-outono",
    nome: "Trilha de outono",
    paleta: ["#8A3B12", "#F2C14E", "#F9E2B3"],
    titulo: { area: [24, 6, 52, 9.5], tinta: "escura" },
    // Só o corpo das placas, sem as pontas de seta.
    stats: [[57.5, 21.1, 29.5, 4.1], [57, 28.8, 33, 4.2], [58, 37.2, 32, 4.2], [60, 45.1, 31.5, 4]],
    // Centralizados em cada cartão (a 2ª fileira começa em ~66%).
    extras: [[6.5, 56, 39.5, 7.8], [52.5, 56, 39.5, 7.8], [6.5, 67.4, 39.5, 8], [52.5, 67.4, 39.5, 8]],
    // À direita dos livros e da folha.
    livro: { area: [33, 80.6, 58, 13.2], margemEsq: 0, tinta: "escura" },
  },
  {
    tipo: "ilustrado",
    id: "sofa-boston",
    nome: "Sofá de outono",
    paleta: ["#8B3A1A", "#E58A3A", "#F7E1BC"],
    titulo: { area: [20.1, 10.5, 63.9, 18.1], tinta: "escura" },
    stats: [[13.8, 31.5, 22.8, 13.6], [39.3, 31.5, 23, 13.8], [64.9, 31.5, 23.1, 13.7]],
    // Dentro do papel, sem encostar nas folhas nem nas folhinhas do Quill.
    livro: { area: [27, 49.3, 52.5, 13], margemEsq: 0, tinta: "escura" },
  },
  {
    tipo: "ilustrado",
    id: "placas-estreladas",
    nome: "Placas sob as estrelas",
    paleta: ["#1E2A5E", "#F3C552", "#F6DFB4"],
    titulo: { area: [6, 4, 50, 11], tinta: "clara" },
    stats: [[52.5, 17, 37, 8.2], [55, 27, 40, 7], [52, 36, 40, 7.4], [54.5, 45.8, 41, 7.2]],
    // Coluna à esquerda dos livros, longe da borda recortada do papel.
    livro: { area: [8.5, 68.6, 52, 18.2], margemEsq: 0, tinta: "escura" },
  },
  {
    tipo: "ilustrado",
    id: "escrivaninha-botanica",
    nome: "Escrivaninha botânica",
    paleta: ["#3E4A26", "#C9772E", "#F6E3BE"],
    titulo: { area: [21.4, 5.4, 58.6, 11.7], tinta: "escura" },
    // Sem chegar nas flores do canto direito do cartão.
    destaque: { area: [44.5, 23.4, 44, 28.1], tinta: "escura", pautas: [31.1, 37.2, 43.6] },
    stats: [[5, 54.5, 43.1, 9.9], [51.2, 54.5, 43.8, 9.9], [5, 66.3, 43.3, 10.5], [51.3, 66.3, 43.8, 10.5]],
    livro: { area: [2, 78.9, 80, 16.2], margemEsq: 31, tinta: "escura" },
  },
  {
    tipo: "ilustrado",
    id: "biblioteca-noturna",
    nome: "Biblioteca noturna",
    paleta: ["#2B1C3D", "#E0A04A", "#F8E0B5"],
    titulo: { area: [24, 8.2, 52.1, 10.3], tinta: "escura" },
    destaque: { area: [46.5, 23.7, 48, 28.2], tinta: "escura", pautas: [31.2, 37.3, 43.4] },
    stats: [[5.3, 54.9, 42.7, 10.5], [51, 54.9, 43.4, 10.5], [5.4, 66.9, 42.5, 10.5], [51, 66.9, 43.3, 10.5]],
    livro: { area: [4.8, 79.4, 90, 13.9], margemEsq: 24, tinta: "escura" },
  },
  {
    tipo: "ilustrado",
    id: "carta-botanica",
    nome: "Carta botânica",
    paleta: ["#5B4A2E", "#B5643A", "#F5E6CC"],
    // Abaixo do selo, acima do ornamento.
    titulo: { area: [15, 11.5, 70, 6.8], tinta: "escura" },
    stats: [[7.1, 24.2, 41.8, 15.2], [52.5, 24.1, 41.6, 15.3], [7, 41.5, 41.9, 15.3], [52.5, 41.5, 41.6, 15.3]],
    // Termina antes do Quill dormindo nos livros.
    livro: { area: [5, 62, 59, 20], margemEsq: 0, tinta: "escura" },
  },
  {
    tipo: "ilustrado",
    id: "madrugada-insone",
    nome: "Madrugada lendo",
    paleta: ["#22301F", "#E2A13B", "#F6DFB2"],
    titulo: { area: [15.6, 4.7, 68.1, 10.8], tinta: "escura" },
    ano: { area: [32, 16.2, 34.6, 3.4], tinta: "escura" },
    stats: [[12.5, 56.3, 36, 9.6], [52, 56.3, 36, 9.6], [12.5, 67.3, 36, 9.6], [52, 67.5, 36, 9.6]],
    livro: { area: [4, 81.6, 85.3, 13.3], margemEsq: 26, tinta: "escura" },
  },
  {
    tipo: "ilustrado",
    id: "chuva-lagrimas",
    nome: "Chorando na chuva",
    paleta: ["#3A2416", "#D9822B", "#F7E3BE"],
    titulo: { area: [17, 6.3, 66, 8.5], tinta: "escura" },
    ano: { area: [32.5, 16.2, 33, 3.2], tinta: "escura" },
    stats: [[12.5, 56.2, 36, 9.4], [52, 56.2, 36, 9.4], [12.5, 67.3, 36, 9.4], [52, 67.3, 36, 9.4]],
    livro: { area: [4, 82, 85, 13], margemEsq: 26, tinta: "escura" },
  },
  {
    tipo: "ilustrado",
    id: "estudo-surpreso",
    nome: "Plot twist",
    paleta: ["#2E2236", "#E0A04A", "#F7E3BE"],
    titulo: { area: [17, 6.3, 66, 8.5], tinta: "escura" },
    ano: { area: [32.5, 16.2, 33, 3.2], tinta: "escura" },
    stats: [[12.5, 56.2, 36, 9.4], [52, 56.2, 36, 9.4], [12.5, 67.3, 36, 9.4], [52, 67.3, 36, 9.4]],
    livro: { area: [4, 82, 85, 13], margemEsq: 26, tinta: "escura" },
  },
  {
    tipo: "ilustrado",
    id: "livro-voador",
    nome: "Livro voador",
    paleta: ["#5A3A22", "#E58A3A", "#FCF6EF"],
    titulo: { area: [8, 6, 84, 14], tinta: "escura" },
    // Só à direita do ícone de cada pílula (relógio, livro, calendário, barras).
    stats: [[73.5, 33.8, 21.5, 4.8], [73.5, 40, 21.5, 4.8], [73.5, 46, 21.5, 4.8], [73.5, 52.1, 21.5, 4.8]],
    livro: { area: [8, 75, 84, 16], margemEsq: 0, tinta: "escura", cartao: true },
  },
];

/**
 * Modelos do cartaz de desafio (aba "Desafio" do Compartilhar). As áreas de
 * texto de cada um ficam em `cartaz-desafio.tsx`, junto do desenho.
 */
export type ModeloDesafio = {
  tipo: "desafio";
  id: "desafio-podio" | "desafio-placar" | "desafio-retro";
  nome: string;
};

export const MODELOS_DESAFIO: readonly ModeloDesafio[] = [
  { tipo: "desafio", id: "desafio-podio", nome: "Pódio" },
  { tipo: "desafio", id: "desafio-placar", nome: "Placar" },
  { tipo: "desafio", id: "desafio-retro", nome: "Ranking retrô" },
];

export function acharModeloDesafio(id: string | null | undefined): ModeloDesafio {
  return MODELOS_DESAFIO.find((m) => m.id === id) ?? MODELOS_DESAFIO[0]!;
}

export function acharModelo(id: string | null | undefined): ModeloCartaz {
  return MODELOS_CARTAZ.find((m) => m.id === id) ?? MODELOS_CARTAZ[0]!;
}

export const srcModelo = (id: string) => `/img/compartilhar/modelos/${id}.webp`;
