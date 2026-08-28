"use client";

import Image, { type ImageProps } from "next/image";
import { useAjuste, useSlot } from "@/components/imagens-provider";
import { estiloDoAjuste } from "@/lib/ajustes-imagem";

/**
 * Imagem do app que respeita o que o admin definiu para aquele ponto da tela.
 *
 * Use no lugar de `next/image` para qualquer arte de /public/img. Passe também
 * um `slot` — o id do ponto onde a arte aparece ("home.avatar"): é ele que
 * permite trocar a arte só ali e ganha o lápis de edição no modo admin. Sem
 * `slot`, ainda vale o ajuste antigo por caminho de arquivo.
 *
 * Fotos de perfil ficam de fora: quem ajusta aquelas é a própria pessoa, no
 * editor de perfil.
 */
export function AppImage({
  src,
  slot,
  alt,
  style,
  ...props
}: ImageProps & { src: string; slot?: string }) {
  const config = useSlot(slot);
  const srcFinal = config?.src ?? src;
  const ajustePorCaminho = useAjuste(srcFinal);
  const ajuste = config
    ? { zoom: config.zoom, posX: config.posX, posY: config.posY }
    : ajustePorCaminho;
  return (
    <Image
      src={srcFinal}
      alt={alt}
      style={{ ...estiloDoAjuste(ajuste), ...style }}
      // O editor do admin acha as imagens editáveis por estes atributos —
      // `data-padrao` é a arte que o código define, para o botão "restaurar".
      data-slot={slot}
      data-padrao={slot ? src : undefined}
      {...props}
    />
  );
}
