import type { LivroEncontrado } from "@/lib/open-library";

/**
 * Empresta a capa de outro resultado que é o MESMO livro.
 *
 * O Google Books traz várias edições de um título e parte delas vem sem
 * imagem — as de catálogo de livraria, com o nome todo em maiúsculas
 * ("HARRY POTTER E A ORDEM DA FENIX"). Escolher uma dessas salvava o livro
 * sem capa, mesmo com a mesma obra tendo capa logo ao lado na lista ou na
 * Open Library. Foi o que deixou três Harry Potter da cissa com a capa "H".
 *
 * "Mesmo livro" é estrito de propósito — capa trocada é pior que capa nenhuma:
 * - título igual depois de normalizar (acento, caixa, pontuação), OU um deles
 *   é o outro + um complemento de edição ("… da Fenix - Edição Comemorativa");
 *   continuação ("Duna: Messias de Duna") não conta;
 * - e, quando os dois têm autor, o sobrenome bate.
 */

const normalizar = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const SEPARADOR = /\s[-–—]\s|:|\(/;

/**
 * Complemento que só descreve a EDIÇÃO, não outro livro. "Duna: Messias de
 * Duna" é continuação — tirar o subtítulo daria a capa errada pra "Duna".
 */
const SO_EDICAO = /\b(edicao|edition|ed|comemorativ\w*|especial|capa dura|capa comum|ilustrad\w*|aniversario|ebook|portuguese|box)\b/;

/** `t` é `base` + um complemento de edição? */
function ehEdicaoDe(t: string, base: string): boolean {
  const i = t.search(SEPARADOR);
  if (i < 0) return false;
  return normalizar(t.slice(0, i)) === base && SO_EDICAO.test(normalizar(t.slice(i)));
}

function mesmoTitulo(a: string, b: string): boolean {
  const ta = normalizar(a);
  const tb = normalizar(b);
  if (!ta || !tb) return false;
  return ta === tb || ehEdicaoDe(b, ta) || ehEdicaoDe(a, tb);
}

function sobrenome(autor: string): string {
  const partes = normalizar(autor).split(" ");
  return partes[partes.length - 1] ?? "";
}

function mesmoAutor(a: string | null, b: string | null): boolean {
  if (!a || !b) return true;
  return sobrenome(a) === sobrenome(b);
}

export function completarCapas(
  resultados: LivroEncontrado[],
  candidatos: LivroEncontrado[],
): LivroEncontrado[] {
  return resultados.map((livro) => {
    if (livro.capaGrande) return livro;
    const irma = candidatos.find(
      (c) => c.capaGrande && mesmoTitulo(livro.titulo, c.titulo) && mesmoAutor(livro.autor, c.autor),
    );
    if (!irma) return livro;
    return { ...livro, capaThumb: irma.capaThumb ?? irma.capaGrande, capaGrande: irma.capaGrande };
  });
}
