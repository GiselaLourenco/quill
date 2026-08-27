import type { Amigo, EntradaDiario, Livro } from "./types";

export const meusLivros: Livro[] = [
  { id: "nome-vento", titulo: "O Nome do Vento", autor: "Patrick Rothfuss", status: "lendo", paginaAtual: 292, totalPaginas: 656, nota: 5, cover_kind: "illustrated", cover_palette: "cover-4", atualizadoEm: "2026-07-09" },
  { id: "fahrenheit", titulo: "Fahrenheit 451", autor: "Ray Bradbury", status: "lendo", paginaAtual: 88, totalPaginas: 224, cover_kind: "illustrated", cover_palette: "cover-1", atualizadoEm: "2026-07-08" },
  { id: "ventania", titulo: "A Ventania", autor: "Laura Conrado", status: "quero_ler", cover_kind: "illustrated", cover_palette: "cover-3", atualizadoEm: "2026-07-05" },
  { id: "duna", titulo: "Duna", autor: "Frank Herbert", status: "quero_ler", cover_kind: "illustrated", cover_palette: "cover-2", atualizadoEm: "2026-07-02" },
  { id: "kafka", titulo: "Kafka à Beira-Mar", autor: "Haruki Murakami", status: "terminei", nota: 4, cover_kind: "illustrated", cover_palette: "cover-4", atualizadoEm: "2026-06-20" },
  { id: "torto-arado", titulo: "Torto Arado", autor: "Itamar Vieira Jr.", status: "terminei", nota: 5, cover_kind: "illustrated", cover_palette: "cover-1", atualizadoEm: "2026-06-01" },
  { id: "circe", titulo: "Circe", autor: "Madeline Miller", status: "recomendado", cover_kind: "illustrated", cover_palette: "cover-2", atualizadoEm: "2026-07-07", indicadoPor: "Maria" },
  { id: "pachinko", titulo: "Pachinko", autor: "Min Jin Lee", status: "recomendado", cover_kind: "illustrated", cover_palette: "cover-3", atualizadoEm: "2026-06-28", indicadoPor: "Bia" },
  { id: "solitario", titulo: "O Solitário", autor: "Eugène Ionesco", status: "abandonei", nota: 2, cover_kind: "illustrated", cover_palette: "cover-4", atualizadoEm: "2026-05-14" },
];

export const amigos: Amigo[] = [
  {
    id: "maria",
    nome: "Maria",
    inicial: "M",
    corAvatar: "cover-2",
    atividadeEm: "2026-07-10",
    livros: [
      {
        id: "m1", titulo: "Circe", autor: "Madeline Miller", status: "lendo",
        paginaAtual: 140, totalPaginas: 400, nota: 5, cover_kind: "illustrated",
        cover_palette: "cover-2", atualizadoEm: "2026-07-10",
        ultimoComentarioPublico: "Impossível largar. Cada capítulo é um feitiço.",
        comentarios: [
          { id: "m1c1", texto: "Impossível largar. Cada capítulo é um feitiço.", data: "2026-07-10", capitulo: "Cap. 12" },
          { id: "m1c2", texto: "A Circe da Miller é tudo o que eu queria da mitologia grega — protagonista, não coadjuvante.", data: "2026-07-05", capitulo: "Cap. 8" },
          { id: "m1c3", texto: "A prosa é hipnótica. Já reli o parágrafo da ilha três vezes.", data: "2026-06-28", capitulo: "Cap. 4" },
          { id: "m1c4", texto: "Comecei achando lento, agora não largo mais.", data: "2026-06-20" },
        ],
      },
      { id: "m2", titulo: "A Ventania", autor: "Laura Conrado", status: "quero_ler", cover_kind: "illustrated", cover_palette: "cover-3", atualizadoEm: "2026-07-04" },
      {
        id: "m3", titulo: "Torto Arado", autor: "Itamar Vieira Jr.", status: "terminei",
        nota: 5, cover_kind: "illustrated", cover_palette: "cover-1", atualizadoEm: "2026-06-15",
        ultimoComentarioPublico: "Livro do ano pra mim.",
        comentarios: [
          { id: "m3c1", texto: "Livro do ano pra mim.", data: "2026-06-15" },
          { id: "m3c2", texto: "A troca de narradoras muda tudo. Que estrutura brilhante.", data: "2026-06-10", capitulo: "Parte 2" },
          { id: "m3c3", texto: "Chorei no fim. Não é só um livro, é um Brasil inteiro.", data: "2026-06-14" },
        ],
      },
    ],
  },
  {
    id: "bia",
    nome: "Bia",
    inicial: "B",
    corAvatar: "cover-1",
    atividadeEm: "2026-07-09",
    livros: [
      {
        id: "b1", titulo: "Pachinko", autor: "Min Jin Lee", status: "lendo",
        paginaAtual: 210, totalPaginas: 490, nota: 4, cover_kind: "illustrated",
        cover_palette: "cover-3", atualizadoEm: "2026-07-09",
        ultimoComentarioPublico: "A parte da Sunja é devastadora.",
        comentarios: [
          { id: "b1c1", texto: "A parte da Sunja é devastadora. Como aguentar tudo aquilo em silêncio?", data: "2026-07-09", capitulo: "Livro I" },
          { id: "b1c2", texto: "O ritmo mudou totalmente na segunda geração — e eu tô adorando.", data: "2026-06-30", capitulo: "Livro II" },
        ],
      },
      { id: "b2", titulo: "Fahrenheit 451", autor: "Ray Bradbury", status: "terminei", nota: 4, cover_kind: "illustrated", cover_palette: "cover-1", atualizadoEm: "2026-06-01" },
    ],
  },
  {
    id: "rafa",
    nome: "Rafa",
    inicial: "R",
    corAvatar: "cover-4",
    atividadeEm: "2026-07-06",
    livros: [
      { id: "r1", titulo: "Duna", autor: "Frank Herbert", status: "lendo", paginaAtual: 320, totalPaginas: 680, cover_kind: "illustrated", cover_palette: "cover-2", atualizadoEm: "2026-07-06" },
      { id: "r2", titulo: "O Nome do Vento", autor: "Patrick Rothfuss", status: "lendo", paginaAtual: 500, totalPaginas: 656, nota: 5, cover_kind: "illustrated", cover_palette: "cover-4", atualizadoEm: "2026-07-05", ultimoComentarioPublico: "Kvothe é insuportável e eu amo." },
    ],
  },
];

export const meuDiario: EntradaDiario[] = [
  { id: "d1", livroId: "nome-vento", livroTitulo: "O Nome do Vento", cover_palette: "cover-4", capitulo: "Cap. 32", texto: "A cena da Universidade me pegou. Rothfuss constrói o mundo devagar e é isso que faz funcionar.", data: "2026-07-09", publico: false, tipo: "capitulo" },
  { id: "d2", livroId: "fahrenheit", livroTitulo: "Fahrenheit 451", cover_palette: "cover-1", texto: "Reli depois de anos. Envelheceu como vinho.", data: "2026-07-07", publico: true, tipo: "livro" },
  { id: "d3", livroId: "kafka", livroTitulo: "Kafka à Beira-Mar", cover_palette: "cover-4", texto: "Terminei. Não sei explicar, só sei que vou pensar nesse livro por semanas.", data: "2026-06-20", publico: true, tipo: "livro" },
  { id: "d4", livroId: "nome-vento", livroTitulo: "O Nome do Vento", cover_palette: "cover-4", capitulo: "Cap. 20", texto: "Anota: pesquisar sobre o sistema de simpatia depois.", data: "2026-07-02", publico: false, tipo: "capitulo" },
  { id: "d5", livroId: "torto-arado", livroTitulo: "Torto Arado", cover_palette: "cover-1", texto: "Chorei. Só isso.", data: "2026-06-01", publico: false, tipo: "livro" },
  { id: "d6", livroId: "solitario", livroTitulo: "O Solitário", cover_palette: "cover-4", texto: "Abandonei na metade. Não conectei.", data: "2026-05-14", publico: false, tipo: "livro" },
];

export const STATUS_META: Record<
  import("./types").StatusLivro,
  { label: string; corBg: string; corText: string; ordem: number }
> = {
  lendo:        { label: "Lendo",             corBg: "bg-coral",     corText: "text-paper", ordem: 1 },
  quero_ler:    { label: "Quero ler",         corBg: "bg-mustard",   corText: "text-ink",   ordem: 2 },
  terminei:     { label: "Terminei",          corBg: "bg-moss",      corText: "text-paper", ordem: 3 },
  recomendado:  { label: "Recomendados",      corBg: "bg-navy",      corText: "text-paper", ordem: 4 },
  abandonei:    { label: "Abandonei",         corBg: "bg-ink-soft",  corText: "text-paper", ordem: 5 },
};
