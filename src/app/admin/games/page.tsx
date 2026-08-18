import { requireAdmin } from "@/modules/auth/session"
import { prisma } from "@/lib/prisma"
import GamesClient, { type GameRow, type TournamentRow, type ChampionRow } from "./games-client"

export const dynamic = "force-dynamic"

const dateFmt = (d: Date) => d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })

export default async function AdminGamesPage() {
  await requireAdmin()

  const [games, totalGames, activeGames, totalPlays, totalTournaments, totalChampions, tournaments, champions] =
    await Promise.all([
      prisma.game.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          id: true, title: true, key: true, genre: true, mode: true, isActive: true, createdAt: true,
          _count: { select: { scores: true, tournaments: true } },
        },
      }),
      prisma.game.count(),
      prisma.game.count({ where: { isActive: true } }),
      prisma.gameScore.count(),
      prisma.tournament.count(),
      prisma.gameChampion.count(),
      prisma.tournament.findMany({
        orderBy: { startsAt: "desc" },
        take: 10,
        select: { id: true, name: true, season: true, status: true, startsAt: true, endsAt: true, game: { select: { title: true } } },
      }),
      prisma.gameChampion.findMany({
        orderBy: { decidedAt: "desc" },
        take: 10,
        select: { scope: true, period: true, anchor: true, winnerLabel: true, totalScore: true, decidedAt: true, game: { select: { title: true } } },
      }),
    ])

  const gameRows: GameRow[] = games.map((g) => ({
    id: g.id,
    title: g.title,
    key: g.key,
    genre: g.genre,
    mode: g.mode,
    isActive: g.isActive,
    plays: g._count.scores,
    tournaments: g._count.tournaments,
  }))

  const tournamentRows: TournamentRow[] = tournaments.map((t) => ({
    id: t.id,
    name: t.name,
    game: t.game?.title ?? null,
    season: t.season,
    status: t.status,
    starts: dateFmt(t.startsAt),
    ends: dateFmt(t.endsAt),
  }))

  const championRows: ChampionRow[] = champions.map((c) => ({
    game: c.game?.title ?? null,
    scope: c.scope,
    period: c.period,
    anchor: c.anchor,
    winner: c.winnerLabel,
    score: Number(c.totalScore),
    decided: dateFmt(c.decidedAt),
  }))

  return (
    <GamesClient
      stats={{ games: totalGames, active: activeGames, plays: totalPlays, tournaments: totalTournaments, champions: totalChampions }}
      games={gameRows}
      tournaments={tournamentRows}
      champions={championRows}
    />
  )
}
