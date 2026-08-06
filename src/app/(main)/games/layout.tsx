import GamesSidebar from "@/components/games/GamesSidebar";

export default function GamesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6">
      <div className="flex flex-col gap-6 lg:flex-row">
        <GamesSidebar />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
