import { notFound } from "next/navigation";
import GameBoard from "@/components/games/GameBoard";
import { gameBySlug } from "@/config/games";
import { getBoardTheme } from "@/config/game-themes";
import { getEngine, hasEngine } from "@/modules/games/engines";

export const dynamic = "force-dynamic";

export default async function PlayPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const cfg = gameBySlug(slug);
  if (!cfg || cfg.status !== "live" || !hasEngine(cfg.key)) notFound();
  const engine = getEngine(cfg.key);
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
