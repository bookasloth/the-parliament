/**
 * Vyapaar balance harness (M5b) — DB-free, deterministic.
 *
 * Plays N full games with bot policies over the pure engine and reports the metrics that
 * tell us whether the economy is fair and the right length. Deterministic: seed = game index,
 * no Math.random. Run: `npx tsx scripts/vyapaar-balance.ts [N]`.
 */
import { createGame } from "../src/modules/vyapaar/engine/state"
import type { GameState, Intent } from "../src/modules/vyapaar/engine/state"
import { applyIntent, nextAutoIntent, winnerOf } from "../src/modules/vyapaar/engine/engine"
import { citiesOwned, controlsSet, controlledSets, netWorth } from "../src/modules/vyapaar/engine/helpers"
import { CITIES, COMPANIES, MAX_ROUNDS } from "../src/modules/vyapaar/engine/data"

const OPENING = 25000
const PLAYERS = 4
const CAP = 100000 // per-game step backstop

type Policy = {
  name: string
  buy: (s: GameState) => Intent
  bid: (s: GameState, seat: number) => Intent
  manage: (s: GameState) => Intent
}

// value of the thing on offer during a buy/auction
function pendingValue(s: GameState): number {
  if (s.pendingCity !== null) return CITIES[s.pendingCity].price
  if (s.pendingCompany !== null) return COMPANIES[s.pendingCompany].buy
  if (s.auction) return s.auction.kind === "city" ? CITIES[s.auction.index].price : COMPANIES[s.auction.index].buy
  return 0
}

/** First owned, set-controlled, unmortgaged city that can still be developed (engine re-checks even-build). */
function developCandidate(s: GameState, seat: number): number | null {
  const owned = citiesOwned(s, seat)
    .filter((id) => controlsSet(s, seat, CITIES[id].zone) && !s.cities[id].mortgaged && s.cities[id].level < 6)
    .sort((a, b) => s.cities[a].level - s.cities[b].level) // lowest first → respects even-build
  return owned.length ? owned[0] : null
}

const greedy: Policy = {
  name: "greedy",
  buy: (s) => (s.players[s.active].cash >= pendingValue(s) ? { type: "buy" } : { type: "decline" }),
  bid: (s, seat) => ({ type: "bid", amount: Math.min(s.players[seat].cash, Math.round(pendingValue(s) * 0.5)) }),
  manage: (s) => {
    const id = developCandidate(s, s.active)
    if (id !== null && s.players[s.active].cash >= Math.round(CITIES[id].price * 0.1)) return { type: "develop", cityId: id }
    return { type: "end_turn" }
  },
}

const thrifty: Policy = {
  name: "thrifty",
  buy: (s) => (s.players[s.active].cash - pendingValue(s) >= OPENING * 0.3 ? { type: "buy" } : { type: "decline" }),
  bid: (s, seat) => ({ type: "bid", amount: Math.min(s.players[seat].cash, Math.round(pendingValue(s) * 0.2)) }),
  manage: (s) => {
    const id = developCandidate(s, s.active)
    if (id !== null && s.players[s.active].cash > OPENING * 0.5) return { type: "develop", cityId: id }
    return { type: "end_turn" }
  },
}

// seats: 0,2 greedy · 1,3 thrifty — lets us compare strategy win-rates
const POLICIES = [greedy, thrifty, greedy, thrifty]

interface GameResult {
  turns: number
  winner: number
  winnerPolicy: string
  endReason: "rounds" | "sets"
  winnerRatio: number // winner net worth / opening
  brokeEver: boolean
  firstSetRound: number | null
}

function playGame(seed: number): GameResult {
  const s = createGame(seed, ["p0", "p1", "p2", "p3"], OPENING)
  let turns = 0
  let brokeEver = false
  let firstSetRound: number | null = null
  let steps = 0

  while (!s.ended && steps++ < CAP) {
    let chosen: { seat: number; intent: Intent }
    switch (s.phase) {
      case "roll": chosen = { seat: s.active, intent: { type: "roll" } }; break
      case "buy": chosen = { seat: s.active, intent: POLICIES[s.active].buy(s) }; break
      case "auction": {
        const seat = s.auction ? s.auction.bids.findIndex((b) => b === null) : -1
        chosen = seat >= 0 ? { seat, intent: POLICIES[seat].bid(s, seat) } : { seat: s.active, intent: { type: "end_turn" } }
        break
      }
      default: chosen = { seat: s.active, intent: POLICIES[s.active].manage(s) } // manage
    }

    const r = applyIntent(s, chosen.seat, chosen.intent)
    if ("error" in r) {
      const fb = nextAutoIntent(s)
      if (!fb) break
      applyIntent(s, fb.seat, fb.intent)
      if (fb.intent.type === "end_turn") turns++
    } else if (chosen.intent.type === "end_turn") {
      turns++
    }

    if (s.players.some((p) => p.cash === 0)) brokeEver = true
    if (firstSetRound === null && s.players.some((_, seat) => controlledSets(s, seat) >= 1)) firstSetRound = s.round
  }

  const winner = winnerOf(s)
  return {
    turns,
    winner,
    winnerPolicy: POLICIES[winner].name,
    endReason: s.round > MAX_ROUNDS ? "rounds" : "sets",
    winnerRatio: netWorth(s, winner) / OPENING,
    brokeEver,
    firstSetRound,
  }
}

const median = (xs: number[]) => { const a = [...xs].sort((x, y) => x - y); return a[Math.floor(a.length / 2)] }
const mean = (xs: number[]) => xs.reduce((n, x) => n + x, 0) / xs.length
const pct = (n: number, d: number) => `${((100 * n) / d).toFixed(1)}%`

function main() {
  const N = Number(process.argv[2] ?? 2000)
  const results: GameResult[] = []
  for (let seed = 1; seed <= N; seed++) results.push(playGame(seed))

  const turns = results.map((r) => r.turns)
  const winsBySeat = [0, 0, 0, 0]
  const winsByPolicy: Record<string, number> = { greedy: 0, thrifty: 0 }
  let endRounds = 0, broke = 0
  const ratios: number[] = [], firstSets: number[] = []
  for (const r of results) {
    winsBySeat[r.winner]++
    winsByPolicy[r.winnerPolicy]++
    if (r.endReason === "rounds") endRounds++
    if (r.brokeEver) broke++
    ratios.push(r.winnerRatio)
    if (r.firstSetRound !== null) firstSets.push(r.firstSetRound)
  }

  console.log(`\n=== Vyapaar balance — ${N} games, ${PLAYERS} players, opening ${OPENING} ===\n`)
  console.log(`Game length      median ${median(turns)} turns · mean ${mean(turns).toFixed(1)} · min ${Math.min(...turns)} · max ${Math.max(...turns)}`)
  console.log(`                 @35s/turn ≈ ${(median(turns) * 35 / 60).toFixed(0)} min (median)   [MAX_ROUNDS=${MAX_ROUNDS}]`)
  console.log(`End reason       ${pct(endRounds, N)} hit MAX_ROUNDS · ${pct(N - endRounds, N)} early 3-set close`)
  console.log(`Seat win-rate    ${winsBySeat.map((w, i) => `s${i} ${pct(w, N)}`).join(" · ")}   (fair ≈ 25% each)`)
  console.log(`Strategy win     greedy ${pct(winsByPolicy.greedy, N)} (2 seats) · thrifty ${pct(winsByPolicy.thrifty, N)} (2 seats)`)
  console.log(`Winner wealth    median ${median(ratios).toFixed(2)}× opening · mean ${mean(ratios).toFixed(2)}×`)
  console.log(`Broke (cash 0)   ${pct(broke, N)} of games had a player hit 0 cash`)
  console.log(`First zone set   median round ${firstSets.length ? median(firstSets) : "—"}`)
  console.log("")
}

main()
