import { notFound } from "next/navigation";
import { AmigosEstantes } from "@/components/amigos-estantes";
import { chaveAtualizacao, type ComentarioFeed } from "@/lib/interacoes";
import type { Atividade, FriendItem, FriendShelf } from "@/lib/friends";

/** Timestamp de `horas` atrás — pros "há 11h" do mock. */
function ha(horas: number) {
  return new Date(Date.now() - horas * 3_600_000).toISOString();
}

/**
 * Mock do feed dos amigos com "curtir" (só em `next dev`). Amigos e livros
 * de mentira; curtir fica só na tela. Em produção responde 404.
 */
export default function EstanteDemoPage() {
  if (process.env.NODE_ENV === "production") notFound();

  const livro = (
    id: string,
    title: string,
    creator: string,
    cover_palette: number,
    status: string,
    atividade: Atividade,
    extra: Partial<FriendItem> = {},
  ): FriendItem => ({
    id: `demo-${id}`,
    title,
    creator,
    cover_kind: "illustrated",
    cover_url: null,
    cover_palette,
    status,
    is_recommended: false,
    stars: null,
    progressLabel: null,
    percent_lido: null,
    total_units: null,
    paginas_lidas: 0,
    lastComment: null,
    atividade,
    chave: chaveAtualizacao(atividade),
    interacoes: { curtidas: 0, euCurti: false, comentarios: [] },
    ...extra,
  });

  const shelves: FriendShelf[] = [
    {
      friendId: "brisa",
      name: "brisa",
      items: [
        livro("mistborn", "Mistborn", "Brandon Sanderson", 3, "finished", { tipo: "status", status: "finished", noCadastro: false, em: ha(11) }),
        livro("well", "The Well of Ascension", "Brandon Sanderson", 2, "reading", { tipo: "leitura", posicao: "pág. 66", em: ha(16) }, { progressLabel: "pág. 66" }),
        livro("verity", "Verity", "Colleen Hoover", 1, "finished", { tipo: "status", status: "finished", noCadastro: true, em: ha(30) }),
      ],
    },
    {
      friendId: "maria",
      name: "Maria",
      items: [
        livro("circe", "Circe", "Madeline Miller", 1, "finished", { tipo: "nota", estrelas: 5, em: ha(2) }, { stars: 5 }),
        livro("torto", "Torto Arado", "Itamar Vieira Jr.", 0, "reading", {
          tipo: "comentario",
          texto: "a parte da Bibiana me pegou de jeito, precisei parar um pouco",
          capitulo: 7,
          em: ha(5),
        }),
      ],
    },
    {
      friendId: "rafa",
      name: "Rafa",
      items: [
        livro("duna", "Duna", "Frank Herbert", 2, "reading", { tipo: "status", status: "reading", noCadastro: false, em: ha(8) }),
        livro("pachinko", "Pachinko", "Min Jin Lee", 3, "want", { tipo: "status", status: "want", noCadastro: false, em: ha(52) }),
      ],
    },
  ];

  // Uns com curtidas, outros zerados — pra ver o coração sozinho e com número.
  const curtidasDemo: Record<string, number> = {
    "demo-mistborn": 3,
    "demo-circe": 7,
    "demo-torto": 1,
    "demo-well": 0,
    "demo-verity": 0,
    "demo-duna": 2,
    "demo-pachinko": 0,
  };

  // Conversa em alguns cartões, pra ver a lista acima do "comentar".
  const comentariosDemo: Record<string, ComentarioFeed[]> = {
    "demo-mistborn": [
      { id: "c1", nome: "Maria", texto: "o final!!! me conta o que achou do Kelsier 😭", gifUrl: null, quando: "há 9h" },
      { id: "c2", nome: "Você", texto: "também amei! o Kelsier é tudo", gifUrl: null, quando: "há 7h", meu: true },
      { id: "c3", nome: "Rafa", texto: "agora vai pro segundo, é melhor ainda", gifUrl: null, quando: "há 6h" },
    ],
    "demo-circe": [{ id: "c4", nome: "brisa", texto: "tá na minha lista faz tempo, vou subir", gifUrl: null, quando: "há 1h" }],
  };

  for (const it of shelves.flatMap((sh) => sh.items)) {
    it.interacoes = { curtidas: curtidasDemo[it.id] ?? 0, euCurti: false, comentarios: comentariosDemo[it.id] ?? [] };
  }

  return (
    <div className="flex-1 px-4 pb-24 pt-4">
      <AmigosEstantes shelves={shelves} demo />
    </div>
  );
}
