import { notFound } from "next/navigation";
import GameBoard from "@/components/games/GameBoard";
import HitAndBlowBoard from "@/components/games/HitAndBlowBoard";
import { gameBySlug } from "@/config/games";
import { getBoardTheme } from "@/config/game-themes";
import { getEngine, hasEngine } from "@/modules/games/engines";

export const dynamic = "force-dynamic";

export default async function PlayPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const cfg = gameBySlug(slug);
  if (!cfg || cfg.status !== "live" || !hasEngine(cfg.key)) notFound();
  const engine = getEngine(cfg.key);

  // Count games (Hit and Blow) use the compact single-input board.
  if (engine.render === "count") {
    return <HitAndBlowBoard gameKey={cfg.key} slug={cfg.slug} name={cfg.name} length={engine.length} maxGuesses={engine.maxGuesses} />;
  }

  return (
    <GameBoard
      gameKey={cfg.key}
      slug={cfg.slug}
      name={cfg.name}
      length={engine.length}
      maxGuesses={engine.maxGuesses}
      render={engine.render}
      keyboard={engine.keyboard}
      theme={getBoardTheme(cfg.key)}
    />
  );
}
