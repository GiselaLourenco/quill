import { TabBar } from "@/components/tab-bar";

export default function TabsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Quem rola é o documento, não uma <main> com `overflow-y-auto` dentro de
    // uma caixa de altura travada. Aquele arranjo aninhava roladores, e no
    // celular isso desalinha a área de toque dos elementos `sticky` — o botão
    // aparecia num lugar e respondia em outro.
    // `overflow-x-clip` corta arte com zoom que vaza pra fora da tela (o
    // `perfil.badges` está em 300%). Sem isso o documento fica mais largo que
    // a tela e o Chrome no Android alarga a área da barra fixa: ela sai
    // cortada à direita e embaixo. `clip` não cria rolador, então não quebra
    // os `sticky`.
    <div className="overflow-x-clip bg-paper">
      <div
        className="mx-auto flex min-h-dvh w-full max-w-[390px] flex-col bg-paper"
        style={{ paddingBottom: "var(--tabbar-h)" }}
      >
        <main className="flex flex-1 flex-col">{children}</main>
      </div>
      <TabBar />
    </div>
  );
}
