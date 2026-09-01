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
    <div className="bg-paper">
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
