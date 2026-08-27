export type StatusLivro =
  | "quero_ler"
  | "lendo"
  | "terminei"
  | "abandonei"
  | "recomendado";

export type CoverKind = "real" | "illustrated";

export type TipoLivro = "fisica" | "ebook" | "audiobook";

export type Livro = {
  id: string;
  titulo: string;
  autor: string;
  status: StatusLivro;
  paginaAtual?: number;
  totalPaginas?: number;
  nota?: number; // 0..5
  cover_kind: CoverKind;
  cover_url?: string;
  cover_palette: "cover-1" | "cover-2" | "cover-3" | "cover-4";
  atualizadoEm: string; // ISO
  indicadoPor?: string; // nome do amigo
  tipo?: TipoLivro;
  genero?: string;
  playlistSpotify?: string;
};

export type ComentarioAmigo = {
  id: string;
  texto: string;
  data: string; // ISO
  capitulo?: string;
};

export type Amigo = {
  id: string;
  nome: string;
  inicial: string;
  corAvatar: "cover-1" | "cover-2" | "cover-3" | "cover-4";
  livros: (Livro & {
    ultimoComentarioPublico?: string;
    comentarios?: ComentarioAmigo[];
  })[];
  atividadeEm: string; // ISO
};

export type EntradaDiario = {
  id: string;
  livroId: string;
  livroTitulo: string;
  cover_palette: Livro["cover_palette"];
  capitulo?: string;
  texto: string;
  data: string; // ISO
  publico: boolean;
  tipo: "livro" | "capitulo";
};
