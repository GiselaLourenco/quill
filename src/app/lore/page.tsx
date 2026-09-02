import type { Metadata } from "next";
import { LoreLeitor } from "@/components/lore-leitor";

export const metadata: Metadata = {
  title: "A história do Quill",
  description: "De onde vem o cheiro de livro novo.",
};

// Fora do grupo (tabs) de propósito: a história abre em tela cheia, sem a tab
// bar, e é pública — quem ainda não tem conta pode conhecer o Quill antes.
export default function LorePage() {
  return <LoreLeitor />;
}
