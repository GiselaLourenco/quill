/**
 * Artes disponíveis para foto de perfil.
 *
 * É uma SELEÇÃO entre artes do próprio app, não upload de imagem — por isso
 * não esbarra na decisão de 2026-07-06 que tirou upload de foto do produto.
 * A lista também é a lista de permissão do servidor: só um `src` daqui entra
 * no banco, então o cliente não consegue gravar uma URL arbitrária.
 *
 * Além delas, o admin adiciona fotos que viram opção para todo mundo (pasta
 * `avatares/` do bucket `artes`, ver `lib/artes.ts`). O servidor confere que
 * o arquivo existe lá antes de gravar.
 */
export const AVATARES = [
  { id: "ok", nome: "Quill ok", src: "/img/perfil/quill-ok.webp" },
  { id: "rindo", nome: "Quill rindo", src: "/img/perfil/quill-rindo.webp" },
  { id: "inlove", nome: "Quill apaixonado", src: "/img/perfil/quill-inlove.webp" },
  { id: "omg", nome: "Quill surpreso", src: "/img/perfil/quill-omg.webp" },
  { id: "bolado", nome: "Quill bolado", src: "/img/perfil/quill-bolado.webp" },
  { id: "zen", nome: "Quill zen", src: "/img/perfil/quill-zen.webp" },
] as const;

export type AvatarOpcao = {
  id: string;
  nome: string;
  src: string;
  /** Foto adicionada pelo admin: preenche o círculo em vez de caber nele. */
  foto?: boolean;
};

/**
 * Início da URL de uma imagem no bucket `artes`. Repete o prefixo de
 * `lib/artes.ts` porque aquele arquivo lê o disco e não roda no navegador.
 */
const PREFIXO_FOTO = `${
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
}/storage/v1/object/public/artes/`;

/** É uma foto enviada (mora no Storage), e não uma arte do catálogo? */
export function ehFotoEnviada(src: string | null): src is string {
  return Boolean(
    src &&
      PREFIXO_FOTO.length > "/storage/v1/object/public/artes/".length &&
      src.startsWith(PREFIXO_FOTO) &&
      !src.includes(".."),
  );
}

export function avatarDeFoto(src: string): AvatarOpcao {
  return { id: src, nome: "Foto do perfil", src, foto: true };
}

/** Fundo padrão do círculo quando há avatar. */
export const AVATAR_FUNDO_PADRAO = "#6D6885";

/** Paleta de fundo do avatar — é também a lista de permissão do servidor. */
export const AVATAR_FUNDOS = [
  "#6D6885", "#F2E9D8", "#B7C295", "#6A7F5A",
  "#2E3630", "#E36A3D", "#EBC27A", "#C9B79C",
] as const;

export function avatarPorSrc(src: string | null): AvatarOpcao | null {
  if (!src) return null;
  if (ehFotoEnviada(src)) return avatarDeFoto(src);
  return AVATARES.find((a) => a.src === src) ?? null;
}

/** Foto de quem ainda não escolheu: todo perfil já nasce com o Quill ok. */
export const AVATAR_PADRAO: AvatarOpcao = AVATARES[0];

/**
 * A arte a mostrar para um perfil. Ao contrário de `avatarPorSrc`, nunca
 * devolve null — sem escolha, ou com um `src` que saiu do catálogo, cai no
 * padrão. É esta que as telas usam; `avatarPorSrc` fica pra quem precisa
 * saber se houve escolha de verdade (o editor de perfil).
 */
export function avatarDeExibicao(src: string | null): AvatarOpcao {
  return avatarPorSrc(src) ?? AVATAR_PADRAO;
}
