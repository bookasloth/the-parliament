import GameBoard from "@/components/games/GameBoard";
import { gameByKey } from "@/config/games";
import { getBoardTheme } from "@/config/game-themes";
import { getEngine } from "@/modules/games/engines";

export const metadata = { title: "Play · Alfazy" };
export const dynamic = "force-dynamic";

export default function AlfazyPlayPage() {
  const cfg = gameByKey("alfazy")!;
  const engine = getEngine("alfazy");
  return (
    <GameBoard
      gameKey={cfg.key}
      slug={cfg.slug}
      name={cfg.name}
      length={engine.length}
      maxGuesses={engine.maxGuesses}
      keyboard={engine.keyboard}
      theme={getBoardTheme(cfg.key)}
      tileLabels={{ correct: "correct", present: "wrong spot", absent: "not in word" }}
    />
  );
}
