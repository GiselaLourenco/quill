/**
 * Artes disponíveis para foto de perfil.
 *
 * É uma SELEÇÃO entre artes do próprio app, não upload de imagem — por isso
 * não esbarra na decisão de 2026-07-06 que tirou upload de foto do produto.
 * A lista também é a lista de permissão do servidor: só um `src` daqui entra
 * no banco, então o cliente não consegue gravar uma URL arbitrária.
 */
export const AVATARES = [
  { id: "ok", nome: "Quill ok", src: "/img/perfil/quill-ok.webp" },
  { id: "rindo", nome: "Quill rindo", src: "/img/perfil/quill-rindo.webp" },
  { id: "inlove", nome: "Quill apaixonado", src: "/img/perfil/quill-inlove.webp" },
  { id: "omg", nome: "Quill surpreso", src: "/img/perfil/quill-omg.webp" },
  { id: "bolado", nome: "Quill bolado", src: "/img/perfil/quill-bolado.webp" },
  { id: "zen", nome: "Quill zen", src: "/img/perfil/quill-zen.webp" },
] as const;

export type AvatarOpcao = (typeof AVATARES)[number];

/** Fundo padrão do círculo quando há avatar. */
export const AVATAR_FUNDO_PADRAO = "#6D6885";

/** Paleta de fundo do avatar — é também a lista de permissão do servidor. */
export const AVATAR_FUNDOS = [
  "#6D6885", "#F2E9D8", "#B7C295", "#6A7F5A",
  "#2E3630", "#E36A3D", "#EBC27A", "#C9B79C",
] as const;

export function avatarPorSrc(src: string | null): AvatarOpcao | null {
  if (!src) return null;
  return AVATARES.find((a) => a.src === src) ?? null;
}
