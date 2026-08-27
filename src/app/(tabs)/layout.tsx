import { TabBar } from "@/components/tab-bar";

export default function TabsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-dvh bg-paper">
      <div className="mx-auto flex h-dvh w-full max-w-[390px] flex-col bg-paper">
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
        <TabBar />
      </div>
    </div>
  );
}
