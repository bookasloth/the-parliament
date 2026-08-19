import { Suspense } from "react";
import { GamesRail } from "@/components/games/GamesRail";
import GameGuideRail from "@/components/games/GameGuideRail";
import GameAccentScope from "@/components/games/GameAccentScope";
import { ProfileSidebarSkeleton } from "@/components/shared/ProfileSidebarView";

export default function GamesLayout({ children }: { children: React.ReactNode }) {
  return (
    <GameAccentScope>
      <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6">
        <div className="flex flex-col gap-8 lg:flex-row">
        <aside className="hidden w-[280px] flex-shrink-0 lg:block">
          <div className="sticky top-20">
            <Suspense fallback={<ProfileSidebarSkeleton navRows={4} />}>
              <GamesRail />
            </Suspense>
          </div>
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
        {/* Per-game "How to play" + Other games — renders only on a live game's pages. */}
        <aside className="hidden w-[300px] flex-shrink-0 xl:block">
          <div className="sticky top-20">
            <GameGuideRail />
          </div>
        </aside>
        </div>
      </div>
    </GameAccentScope>
  );
}
