"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { GameController, Trophy, Crown, PlayCircle, Confetti } from "@phosphor-icons/react"
import {
  PageHeader, StatCard, StatusBadge, Button, SectionHeader,
  Table, Thead, Tbody, Tr, Th, Td, EmptyState,
} from "../admin-ui"
import { setGameActive } from "./actions"

export interface GameRow {
  id: string
  title: string
  key: string
  genre: string
  mode: string
  isActive: boolean
  plays: number
  tournaments: number
}
export interface TournamentRow {
  id: string
  name: string
  game: string | null
  season: string | null
  status: string
  starts: string
  ends: string
}
export interface ChampionRow {
  game: string | null
  scope: string
  period: string
  anchor: string
  winner: string
  score: number
  decided: string
}
export interface GameStats {
  games: number
  active: number
  plays: number
  tournaments: number
  champions: number
}

function GamesTable({ games }: { games: GameRow[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function toggle(g: GameRow) {
    startTransition(async () => {
      await setGameActive(g.id, !g.isActive)
      router.refresh()
    })
  }

  return (
    <Table>
      <Thead>
        <Tr>
          <Th>Game</Th>
          <Th>Genre</Th>
          <Th>Mode</Th>
          <Th className="text-right">Plays</Th>
          <Th className="text-right">Tournaments</Th>
          <Th>Status</Th>
          <Th className="text-right">Action</Th>
        </Tr>
      </Thead>
      <Tbody>
        {games.map((g) => (
          <Tr key={g.id}>
            <Td>
              <div className="font-medium text-zinc-100">{g.title}</div>
              <div className="font-mono text-[11px] text-zinc-500">{g.key}</div>
            </Td>
            <Td className="capitalize text-zinc-400">{g.genre}</Td>
            <Td className="capitalize text-zinc-400">{g.mode}</Td>
            <Td className="text-right tabular-nums">{g.plays.toLocaleString()}</Td>
            <Td className="text-right tabular-nums">{g.tournaments.toLocaleString()}</Td>
            <Td><StatusBadge status={g.isActive ? "active" : "archived"} /></Td>
            <Td className="text-right">
              <Button
                variant={g.isActive ? "ghost" : "primary"}
                size="sm"
                disabled={pending}
                onClick={() => toggle(g)}
              >
                {g.isActive ? "Disable" : "Enable"}
              </Button>
            </Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  )
}

export default function GamesClient({
  stats, games, tournaments, champions,
}: {
  stats: GameStats
  games: GameRow[]
  tournaments: TournamentRow[]
  champions: ChampionRow[]
}) {
  return (
    <div>
      <PageHeader
        title="Games & Tournaments"
        description="Casual games, inter-batch tournaments, and champions — zero-karma policy enforced platform-wide"
      />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <StatCard label="Games" value={stats.games.toLocaleString()} icon={<GameController className="h-4.5 w-4.5" weight="duotone" />} accent="indigo" />
        <StatCard label="Active" value={stats.active.toLocaleString()} icon={<PlayCircle className="h-4.5 w-4.5" weight="duotone" />} accent="emerald" />
        <StatCard label="Plays" value={stats.plays.toLocaleString()} icon={<Confetti className="h-4.5 w-4.5" weight="duotone" />} accent="sky" />
        <StatCard label="Tournaments" value={stats.tournaments.toLocaleString()} icon={<Trophy className="h-4.5 w-4.5" weight="duotone" />} accent="amber" />
        <StatCard label="Champions" value={stats.champions.toLocaleString()} icon={<Crown className="h-4.5 w-4.5" weight="duotone" />} accent="violet" />
      </div>

      <div className="rounded-[5px] border border-zinc-800 bg-[#111113] p-4 mb-6">
        <SectionHeader title="Games" />
        {games.length === 0 ? (
          <EmptyState icon={<GameController className="h-8 w-8" weight="duotone" />} title="No games yet" description="Games appear here once they are registered for the community." />
        ) : (
          <div className="overflow-x-auto"><GamesTable games={games} /></div>
        )}
      </div>

      <div className="rounded-[5px] border border-zinc-800 bg-[#111113] p-4 mb-6">
        <SectionHeader title="Recent Tournaments" />
        {tournaments.length === 0 ? (
          <EmptyState icon={<Trophy className="h-8 w-8" weight="duotone" />} title="No tournaments yet" description="Scheduled and past tournaments will be listed here." />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <Thead>
                <Tr><Th>Name</Th><Th>Game</Th><Th>Season</Th><Th>Status</Th><Th>Starts</Th><Th>Ends</Th></Tr>
              </Thead>
              <Tbody>
                {tournaments.map((t) => (
                  <Tr key={t.id}>
                    <Td className="font-medium text-zinc-100">{t.name}</Td>
                    <Td className="text-zinc-400">{t.game ?? "—"}</Td>
                    <Td className="text-zinc-400">{t.season ?? "—"}</Td>
                    <Td><StatusBadge status={t.status} /></Td>
                    <Td className="whitespace-nowrap text-zinc-400">{t.starts}</Td>
                    <Td className="whitespace-nowrap text-zinc-400">{t.ends}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </div>
        )}
      </div>

      <div className="rounded-[5px] border border-zinc-800 bg-[#111113] p-4">
        <SectionHeader title="Recent Champions" />
        {champions.length === 0 ? (
          <EmptyState icon={<Crown className="h-8 w-8" weight="duotone" />} title="No champions yet" description="Champions are recorded as tournaments and leaderboards conclude." />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <Thead>
                <Tr><Th>Game</Th><Th>Scope · Period</Th><Th>Winner</Th><Th className="text-right">Score</Th><Th>Decided</Th></Tr>
              </Thead>
              <Tbody>
                {champions.map((c, i) => (
                  <Tr key={i}>
                    <Td className="text-zinc-400">{c.game ?? "—"}</Td>
                    <Td className="capitalize text-zinc-400">{c.scope} · {c.period} <span className="text-zinc-600">({c.anchor})</span></Td>
                    <Td className="font-medium text-zinc-100">{c.winner}</Td>
                    <Td className="text-right tabular-nums">{c.score.toLocaleString()}</Td>
                    <Td className="whitespace-nowrap text-zinc-400">{c.decided}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </div>
        )}
      </div>
    </div>
  )
}
