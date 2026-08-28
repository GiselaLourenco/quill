import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Todas as artes de /public/img, menos as fotos de perfil (quem ajusta aquelas
 * é a própria pessoa, no editor de perfil).
 *
 * Só roda no servidor. Na Vercel a pasta `public` só entra no bundle da função
 * por causa do `outputFileTracingIncludes` no next.config — sem isso a lista
 * volta vazia em produção.
 */
export function listarArtes(): string[] {
  const raiz = join(process.cwd(), "public", "img");
  const saida: string[] = [];
  const andar = (dir: string, prefixo: string) => {
    for (const nome of readdirSync(dir)) {
      const caminho = join(dir, nome);
      if (statSync(caminho).isDirectory()) {
        if (nome === "perfil") continue;
        andar(caminho, `${prefixo}/${nome}`);
      } else if (/\.(webp|png|jpg|jpeg|svg)$/i.test(nome)) {
        saida.push(`${prefixo}/${nome}`);
      }
    }
  };
  try {
    andar(raiz, "/img");
  } catch {
    return [];
  }
  return saida.sort();
}

/** A arte existe em /public/img? É a lista de permissão do servidor. */
export function arteValida(src: string): boolean {
  return listarArtes().includes(src);
}
