"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { MapaAjustes, MapaSlots, SlotImagem } from "@/lib/ajustes-imagem";
import { EditorImagens } from "@/components/editor-imagens";

/** Valores que o admin está mexendo no editor, antes de salvar. */
export type Previa = (SlotImagem & { slot: string }) | null;

type Valor = {
  ajustes: MapaAjustes;
  slots: MapaSlots;
  catalogo: string[];
  admin: boolean;
  previa: Previa;
};

const ImagensContext = createContext<Valor>({
  ajustes: {},
  slots: {},
  catalogo: [],
  admin: false,
  previa: null,
});

export function ImagensProvider({
  ajustes,
  slots,
  catalogo,
  admin,
  children,
}: {
  ajustes: MapaAjustes;
  slots: MapaSlots;
  catalogo: string[];
  admin: boolean;
  children: React.ReactNode;
}) {
  const [previa, setPrevia] = useState<Previa>(null);

  const valor = useMemo<Valor>(
    () => ({ ajustes, slots, catalogo, admin, previa }),
    [ajustes, slots, catalogo, admin, previa],
  );

  return (
    <ImagensContext.Provider value={valor}>
      {children}
      {admin && <EditorImagens slots={slots} catalogo={catalogo} onPrevia={setPrevia} />}
    </ImagensContext.Provider>
  );
}

export function useImagens() {
  return useContext(ImagensContext);
}

/** Ajuste guardado por caminho de arquivo (modelo antigo, ainda vale como fallback). */
export function useAjuste(src: string) {
  return useContext(ImagensContext).ajustes[src];
}

/**
 * Configuração de um slot, já com a prévia do editor aplicada por cima — é o
 * que faz a imagem na tela mexer junto com os sliders.
 */
export function useSlot(slot: string | undefined): SlotImagem | undefined {
  const { slots, previa } = useContext(ImagensContext);
  if (!slot) return undefined;
  if (previa && previa.slot === slot) return previa;
  return slots[slot];
}
