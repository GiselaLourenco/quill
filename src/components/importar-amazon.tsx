"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { importarLivros, type LivroImportado } from "@/app/actions/importar";

const STATUS = [
  { valor: "want", rotulo: "quero ler" },
  { valor: "reading", rotulo: "lendo" },
  { valor: "finished", rotulo: "terminei" },
  { valor: "recomendado", rotulo: "sem decidir" },
];

/**
 * Divide uma linha de CSV respeitando aspas.
 *
 * Título de livro tem vírgula com frequência ("Crime, castigo e outros"), e um
 * `split(",")` cortaria o livro ao meio. Aspas duplas repetidas ("") são o
 * escape do formato.
 */
function separarLinha(linha: string): string[] {
  const campos: string[] = [];
  let atual = "";
  let dentroDeAspas = false;
  for (let i = 0; i < linha.length; i += 1) {
    const c = linha[i];
    if (c === '"') {
      if (dentroDeAspas && linha[i + 1] === '"') {
        atual += '"';
        i += 1;
      } else {
        dentroDeAspas = !dentroDeAspas;
      }
    } else if (c === "," && !dentroDeAspas) {
      campos.push(atual);
      atual = "";
    } else {
      atual += c;
    }
  }
  campos.push(atual);
  return campos.map((c) => c.trim());
}

/**
 * Acha a coluna pelo nome, tolerando variação.
 *
 * O export da Amazon já mudou de cabeçalho entre versões e entre idiomas —
 * casar por pedaço do nome sobrevive a isso melhor que exigir o nome exato.
 */
function acharColuna(cabecalho: string[], nomes: string[]): number {
  return cabecalho.findIndex((c) => {
    // Tira o acento ANTES de derrubar o que não é letra: sem isso "Título"
    // vira "ttulo" (o í some inteiro) e nunca casa com "titulo".
    const limpo = c
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z]/g, "");
    return nomes.some((n) => limpo.includes(n));
  });
}

export function ImportarAmazon() {
  const router = useRouter();
  const [livros, setLivros] = useState<LivroImportado[] | null>(null);
  const [marcados, setMarcados] = useState<Set<number>>(new Set());
  const [status, setStatus] = useState("want");
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<{ criados: number; pulados: number } | null>(null);
  const [enviando, iniciar] = useTransition();

  async function lerArquivo(arquivo: File) {
    setErro(null);
    setResultado(null);
    const texto = await arquivo.text();
    const linhas = texto.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (linhas.length < 2) {
      setErro("O arquivo não tem linhas de livro.");
      return;
    }

    const cabecalho = separarLinha(linhas[0]!);
    const iTitulo = acharColuna(cabecalho, ["title", "titulo"]);
    const iAutor = acharColuna(cabecalho, ["author", "autor"]);
    if (iTitulo === -1) {
      setErro(
        "Não achei a coluna de título. Exporte em Conta → Gerenciar conteúdo e dispositivos → Livros → Export.",
      );
      return;
    }

    const achados = linhas.slice(1).map((linha) => {
      const campos = separarLinha(linha);
      return {
        title: campos[iTitulo] ?? "",
        creator: iAutor >= 0 ? campos[iAutor] || null : null,
      };
    }).filter((l) => l.title.length > 0);

    if (achados.length === 0) {
      setErro("Nenhum título encontrado no arquivo.");
      return;
    }

    setLivros(achados);
    // Tudo marcado por padrão: quem exportou a biblioteca quer a biblioteca.
    setMarcados(new Set(achados.map((_, i) => i)));
  }

  function alternar(i: number) {
    setMarcados((prev) => {
      const proximo = new Set(prev);
      if (proximo.has(i)) proximo.delete(i);
      else proximo.add(i);
      return proximo;
    });
  }

  function importar() {
    if (!livros) return;
    setErro(null);
    iniciar(async () => {
      const r = await importarLivros({
        livros: livros.filter((_, i) => marcados.has(i)),
        status,
      });
      if (r.error) {
        setErro(r.error);
        return;
      }
      setResultado({ criados: r.criados, pulados: r.pulados });
      setLivros(null);
      router.refresh();
    });
  }

  if (resultado) {
    return (
      <div className="rounded-md border-2 border-moss bg-moss/15 p-3 text-sm text-moss-dark">
        <p className="font-bold">
          {resultado.criados} {resultado.criados === 1 ? "livro entrou" : "livros entraram"} na
          estante.
        </p>
        {resultado.pulados > 0 && (
          <p className="mt-1 text-xs">
            {resultado.pulados} {resultado.pulados === 1 ? "já estava" : "já estavam"} lá — não
            dupliquei.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[11px] leading-relaxed text-ink-soft">
        Na Amazon: <strong>Conta → Gerenciar conteúdo e dispositivos → Livros → Export</strong>.
        Chega um CSV por e-mail. Só título e autor são lidos — páginas e capa você completa
        depois, abrindo o livro.
      </p>

      <label className="shadow-hard-sm cursor-pointer rounded-md border-2 border-dashed border-ink bg-paper px-3 py-4 text-center font-display text-[11px] uppercase tracking-wider">
        {livros ? "trocar arquivo" : "escolher o CSV"}
        <input
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void lerArquivo(f);
          }}
        />
      </label>

      {erro && <p className="text-xs font-medium text-coral">{erro}</p>}

      {livros && (
        <>
          <div className="flex items-center justify-between gap-2">
            <span className="font-display text-[11px] uppercase tracking-wider">
              {marcados.size} de {livros.length}
            </span>
            <button
              type="button"
              onClick={() =>
                setMarcados(
                  marcados.size === livros.length
                    ? new Set()
                    : new Set(livros.map((_, i) => i)),
                )
              }
              className="text-xs font-semibold underline underline-offset-2"
            >
              {marcados.size === livros.length ? "desmarcar todos" : "marcar todos"}
            </button>
          </div>

          <label className="flex items-center gap-2 text-xs">
            entram como
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="rounded-md border-2 border-ink bg-card px-2 py-1 text-xs"
            >
              {STATUS.map((s) => (
                <option key={s.valor} value={s.valor}>
                  {s.rotulo}
                </option>
              ))}
            </select>
          </label>

          {/* Lista rolável: uma biblioteca Kindle tem centenas de títulos e a
              lista inteira empurraria o botão de importar pra fora da tela. */}
          <ul className="max-h-56 overflow-y-auto rounded-md border-2 border-ink bg-paper">
            {livros.map((l, i) => (
              <li key={`${l.title}-${i}`} className="border-b border-ink/15 last:border-0">
                <label className="flex items-center gap-2 px-2 py-1.5">
                  <input
                    type="checkbox"
                    checked={marcados.has(i)}
                    onChange={() => alternar(i)}
                    className="h-4 w-4 shrink-0 accent-moss-dark"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-medium">{l.title}</span>
                    {l.creator && (
                      <span className="block truncate text-[10px] text-ink-soft">{l.creator}</span>
                    )}
                  </span>
                </label>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={importar}
            disabled={enviando || marcados.size === 0}
            className="shadow-hard rounded-md border-2 border-ink bg-moss py-2.5 font-display text-xs uppercase tracking-widest text-paper active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-60"
          >
            {enviando ? "Importando…" : `Importar ${marcados.size}`}
          </button>
        </>
      )}
    </div>
  );
}
