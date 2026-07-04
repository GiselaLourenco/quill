import { TabBar } from "@/components/tab-bar";

export default function TabsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <div className="flex-1">{children}</div>
      <TabBar />
    </div>
  );
}
