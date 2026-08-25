import { Suspense } from "react";
import { GamesRail } from "@/components/games/GamesRail";
import GameGuideRail from "@/components/games/GameGuideRail";
import GameAccentScope from "@/components/games/GameAccentScope";
import { GamesFrame } from "@/components/games/GamesFrame";
import { ProfileSidebarSkeleton } from "@/components/shared/ProfileSidebarView";

export default function GamesLayout({ children }: { children: React.ReactNode }) {
  return (
    <GameAccentScope>
      <GamesFrame
        rail={
          <Suspense fallback={<ProfileSidebarSkeleton navRows={4} />}>
            <GamesRail />
          </Suspense>
        }
        guide={<GameGuideRail />}
      >
        {children}
      </GamesFrame>
    </GameAccentScope>
  );
}
