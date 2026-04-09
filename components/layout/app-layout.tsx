import { BottomNav } from "./bottom-nav";
import { TopNav } from "./top-nav";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col pb-20 md:pb-0 md:pt-16">
      <TopNav />
      <main className="flex-1">{children}</main>
      <BottomNav />
    </div>
  );
}
