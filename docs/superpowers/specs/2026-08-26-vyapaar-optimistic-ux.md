# Vyapaar — Optimistic UX System (audit + design + implementation guide)

**Date:** 2026-08-26 · **Status:** design/hand-off — ready for a session to implement.
**Scope:** the live match screen (`src/components/vyapaar/MatchBoard.tsx`) and its mutation path.
**Goal:** make every gameplay action feel *instant* — success-first, not loading-first — while staying
correct under a **server-authoritative multiplayer** model. No blind spinners.

> How to use this doc: read §1–§3 first (they change how you think about optimism *here*), then
> implement §6 (the reusable primitive), then wire each action per the table in §5 and the notes in
> §7. §10 is the acceptance checklist. All code blocks are grounded in the real current types.

---

## 1. Current architecture (audit findings)

The mutation path is small and clean — that's the opportunity.

- **Server is authoritative and returns the FULL view.** `POST /api/vyapaar/[matchId]/intent`
  → `applyMatchIntent(userId, matchId, intent)` runs the engine under a per-match `FOR UPDATE`
  lock and returns **`{ view: PublicView; turnExpiresAt } | { error: string }`**. On success the
  response *is* the new authoritative state; on failure **no writes happened** (the row lock
  releases on rollback).
- **Client replaces its whole view.** `MatchBoard.send(intent)`:
  ```
  setErr(null); setBusy(true)
  POST /intent
  if (!ok) setErr(data.error)          // failure: just a text error
  else { setView(data.view); setTurnExpiresAt(...) }   // success: replace everything
  finally setBusy(false)
  ```
- **Realtime reconciles from the server.** A `vyapaar-match:<id>` channel broadcasts `state`
  on every committed intent (incl. the 10s auto-resolve cron); the client `refetch()`s the full
  view. Presence powers online dots. So **peer actions already arrive as authoritative full views.**
- **Today's UX gaps:**
  1. **One global `busy`** — clicking *any* action disables *every* action.
  2. **Zero optimism** — every click waits ~one round-trip (~80–200ms + network) before anything
     visibly changes.
  3. **Duplicate protection is only the global `busy`** — fine by accident, but not per-action.
  4. **Errors are a bare text line** (`setErr`), no revert story (there's nothing to revert since
     there's no optimism — but that's exactly what we're adding).
  5. **First load** renders straight from `initialView` (SSR) — good, no skeleton needed there;
     but any *panel* that fetches (none today) would need one.

### PublicView (the optimistic surface — everything you may patch)
```ts
players: { name; cash; pos; halted; score; netWorth; left }[]
cities:  { owner: number|null; level: number; mortgaged: boolean }[]
companies: (number|null)[]
pot; active; phase; round
pendingCity; pendingCompany
auction: { kind: "city"|"company"; index; bidded: boolean[] } | null
trades:  { id; from; to; give; get; expiresAt }[]
pendingRents: { id; payer; owner; cityId; amount }[]
headlineLeft; upiLeft; ended; winner
lastRoll: [number,number] | null
log: EngineEvent[]
you; youCanRestructure; restructure: { advance; laps }
```

### The full intent set (from the route allow-list)
`roll · buy · decline · bid · develop · mortgage · unmortgage · sell · propose_trade ·
respond_trade · counter_trade · withdraw_trade · collect_rent · restructure · leave_game ·
end_turn` (plus system-only `expire_trade`, never client-sent).

---

## 2. The core insight (why optimism is *simple* here)

Because **every authoritative view is a complete snapshot**, you never diff or merge. The whole
system reduces to:

1. **Snapshot** the current view.
2. **Overlay** a predicted patch (pure function of `view` + `intent`) → render immediately with a
   subtle *pending* marker.
3. **Supersede**: the very next authoritative view — whether it's *my* action's response *or a
   peer's broadcast/refetch* — **replaces** the overlay wholesale. Reconciliation is just
   `setView(serverView)`.
4. **Revert on failure**: server said `{error}` → `setView(snapshot)` (or refetch to be safe),
   surface a concise error, clear the pending marker.

This is the guardrail against the classic multiplayer bug ("stale optimistic overwrites newer
server state"): **an optimistic overlay never survives an authoritative view.** The overlay is a
temporary local prediction that any real state — mine or a peer's — wipes out. You cannot overwrite
newer state because you never *write* optimistic state anywhere durable; it's a render-time overlay
that the next real view discards.

---

## 3. Operation-state model (reuse this everywhere)

```
idle ──click──▶ submitting ──(safe? apply overlay)──▶ optimistic/pending
                                                          │
                       server {view}  ◀────────────────── │ ──────────────▶ server {error}
                          │                                                     │
                          ▼                                                     ▼
                       confirmed  (replace with authoritative view)         reverted
                          │                                                (restore snapshot,
                          ▼                                                 error toast, retry)
                        idle                                                    │
                                                                                ▼
                                                                              idle
```

- **submitting** and **optimistic/pending** are usually the same instant here (we apply the overlay
  and fire the request together). Keep them distinct in the type so a future blocking action can sit
  in `submitting` without an overlay.
- **confirmed** is not a popup — it's the UI already showing the (now real) state. Toast only when
  the change isn't self-evident on screen (see §6f).

---

## 4. Reconciliation rules (multiplayer-safe)

1. **Authoritative always wins.** Any `{view}` (my response, a broadcast refetch, the 8s safety
   poll) calls `setView(view)` unconditionally and clears *my* matching pending key.
2. **Overlays are ephemeral.** Never store optimistic state outside the render overlay. If a peer's
   broadcast lands while my overlay is pending, the broadcast's view replaces the base and the
   overlay is recomputed *against the new base only if my op is still in-flight*; the moment my
   response lands, the overlay is gone.
3. **Per-op pending token.** Each in-flight op holds a key (see §6a). Reconciliation clears the key
   whose response/echo arrived. A broadcast that isn't my echo does **not** clear my key (my op may
   still be committing) — but it *does* refresh the base view.
4. **Never optimistically resolve outcomes that depend on other players** (auction winner, trade
   acceptance, exact rent after a payer's forced liquidation). Show *pending*, let the server decide.
5. **turnExpiresAt** comes from the server; do not fake it. The countdown is authoritative.

---

## 5. Operation inventory (classification — implement to this table)

Legend: **Opt** = optimistic overlay applied; **Confirm** = require a confirm step *before* firing;
**Loader** = the in-control pending affordance; **Rollback** = revert-to-snapshot needed on error;
**MP risk** = can a peer change the same state concurrently.

| Operation | Reversible | Opt | Confirm | Loader | Skeleton | Rollback | MP risk | Overlay patch |
|---|---|---|---|---|---|---|---|---|
| **roll** | no | *no result* | no | dice tumble + disable Roll | no | n/a | low | none — animate dice, show real `lastRoll` on response |
| **buy** (city/company) | on error | **yes** | no | in-button spinner | no | yes | low | `cash -= price`, `owner = you`, clear `pendingCity/Company`, phase→roll |
| **decline** | n/a | partial | no | in-button | no | no | low | phase→`auction` (or advance) — *pending*, don't predict winner |
| **bid** | n/a | **yes (flag only)** | no | in-button | no | no | **high** | `auction.bidded[you]=true` only; outcome pending |
| **develop** (house/hotel) | on error | **yes** | no | in-button on that city row | no | yes | low | `cash -= upgradeCost`, `city.level += 1` |
| **mortgage** | yes (unmortgage) | **yes** | no | in-button | no | yes | low | `cash += floor(price/2)`, `mortgaged=true` |
| **unmortgage** | yes | **yes** | no | in-button | no | yes | low | `cash -= round(price*0.55)`, `mortgaged=false` |
| **sell** | **no (irreversible)** | yes *after confirm* | **yes** | in-button | no | yes | low | `cash += sellValue`, `owner=null`, `level=0` |
| **collect_rent** | n/a | **yes (provisional amt)** | no | in-button on the rent chip | no | yes | **med** | `players[you].cash += amt`, `players[payer].cash -= amt`, drop `pendingRent`; amount is *provisional* (server may reduce/void) |
| **restructure** | no | **yes** | maybe | in-button | no | yes | low | `cash += advance` |
| **propose_trade** | withdrawable | pending | **review** | in-button | no | no | med | add a *pending-sent* row to `trades[]`; never show accepted |
| **respond_trade** (accept) | **no** | pending | **yes (accept)** | in-button on the trade card | no | no | **high** | pending — server transfers + re-validates; decline may overlay-remove |
| **counter_trade** | withdrawable | pending | review | in-button | no | no | med | pending-sent row |
| **withdraw_trade** | yes | **yes** | no | in-button | no | yes | low | remove my trade from `trades[]` |
| **leave_game** | **no** | pending | **yes (blocking)** | in-button | no | no | n/a | pending — big consequences, let server settle |
| **end_turn** | no | pending | no | in-button | no | no | low | pending (engine auto-advances; usually no explicit click) |

Rule of thumb baked into the table: **you may only optimistically change what *you alone* control
and can compute exactly** (your cash, your property's flags/level, your bid flag). Anything decided
by the server RNG (roll), by other players (auction, trade accept), or by side effects you can't
compute (rent after forced liquidation) is **pending**, not optimistic.

---

## 6. The reusable primitive

### 6a. Action keys (per-op pending + duplicate guard)
One string per concrete control, so only that control shows pending and repeat clicks are ignored.
```ts
function actionKey(intent: Intent): string {
  switch (intent.type) {
    case "develop": case "mortgage": case "unmortgage": case "sell":
      return `${intent.type}:${intent.cityId}`
    case "collect_rent":   return `collect_rent:${intent.rentId}`
    case "respond_trade":  return `respond_trade:${intent.tradeId}`
    case "withdraw_trade": return `withdraw_trade:${intent.tradeId}`
    case "counter_trade":  return `counter_trade:${intent.tradeId}`
    case "bid":            return "bid"
    default:               return intent.type // roll, buy, decline, propose_trade, restructure, leave_game, end_turn
  }
}
```

### 6b. Optimistic patchers (pure, view-in → view-out)
Return `null` for "no safe prediction — go straight to pending." Keep them tiny and total; they only
run for the current player's own actions. Prices come from `CITIES`/`COMPANIES` + the same formulas
the engine uses (`floor(price/2)`, `round(price*0.55)`, `upgradeCost`).
```ts
// pseudo — clone the view shallowly-enough that React re-renders (structuredClone is fine here)
function optimisticPatch(view: PublicView, intent: Intent): PublicView | null {
  const you = view.you
  const v = structuredClone(view) as PublicView
  const P = v.players[you]
  switch (intent.type) {
    case "buy": {
      const cityId = v.pendingCity, coId = v.pendingCompany
      if (cityId != null) { P.cash -= CITIES[cityId].price; v.cities[cityId].owner = you; v.pendingCity = null }
      else if (coId != null) { P.cash -= COMPANIES[coId].buy; v.companies[coId] = you; v.pendingCompany = null }
      else return null
      return v
    }
    case "develop": { const c = v.cities[intent.cityId]; P.cash -= upgradeCost(intent.cityId); c.level += 1; return v }
    case "mortgage": { const c = v.cities[intent.cityId]; P.cash += Math.floor(CITIES[intent.cityId].price/2); c.mortgaged = true; return v }
    case "unmortgage": { const c = v.cities[intent.cityId]; P.cash -= Math.round(CITIES[intent.cityId].price*0.55); c.mortgaged = false; return v }
    case "sell": { const c = v.cities[intent.cityId]; P.cash += sellValue(v, intent.cityId); c.owner = null; c.level = 0; c.mortgaged = false; return v }
    case "restructure": { P.cash += v.restructure.advance; return v }
    case "bid": { if (v.auction) v.auction.bidded[you] = true; return v }
    case "collect_rent": {
      const r = v.pendingRents.find(x => x.id === intent.rentId); if (!r) return null
      v.players[r.owner].cash += r.amount; v.players[r.payer].cash -= r.amount // provisional
      v.pendingRents = v.pendingRents.filter(x => x.id !== intent.rentId); return v
    }
    case "withdraw_trade": { v.trades = v.trades.filter(t => t.id !== intent.tradeId); return v }
    // roll / decline / respond_trade / propose_trade / counter_trade / leave_game / end_turn → pending, no overlay
    default: return null
  }
}
```

### 6c. The hook — `useMatchActions`
Wraps the existing POST. Owns: per-key pending set, the optimistic overlay, snapshot/revert,
and authoritative reconciliation. Drop-in replacement for today's `send`.
```ts
type Pending = { key: string; snapshot: PublicView }
function useMatchActions(matchId: string, view: PublicView, setView: (v: PublicView)=>void,
                         setTurnExpiresAt: (s: string|null)=>void) {
  const [pending, setPending] = useState<Record<string, true>>({})
  const [error, setError] = useState<{ key: string; msg: string; intent: Intent } | null>(null)
  const isPending = useCallback((key: string) => !!pending[key], [pending])

  const run = useCallback(async (intent: Intent) => {
    const key = actionKey(intent)
    if (pending[key]) return                       // 6e duplicate guard
    const snapshot = view                          // 6: snapshot (view is immutable per render)
    setPending(p => ({ ...p, [key]: true }))
    setError(null)
    const overlay = optimisticPatch(view, intent)  // 6b
    if (overlay) setView(overlay)                  // optimistic/pending render
    try {
      const res = await fetch(`/api/vyapaar/${matchId}/intent`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ intent }),
      })
      const data = await res.json()
      if (!res.ok) {                               // reverted
        setView(snapshot)                          // restore (server did NOT write)
        setError({ key, msg: humanError(data.error), intent })
      } else {                                     // confirmed — authoritative wins
        setView(data.view); setTurnExpiresAt(data.turnExpiresAt ?? null)
      }
    } catch {
      setView(snapshot)                            // network failure — nothing committed server-side is unknown; safest is refetch (see note)
      setError({ key, msg: "Network hiccup — tap to retry", intent })
    } finally {
      setPending(p => { const n = { ...p }; delete n[key]; return n })
    }
  }, [matchId, view, pending, setView, setTurnExpiresAt])

  return { run, isPending, error, retry: () => error && run(error.intent), clearError: () => setError(null) }
}
```
**Network-failure caveat:** a true network timeout is ambiguous (the server *might* have committed).
Prefer `refetch()` over `setView(snapshot)` in the `catch` so you re-sync to authoritative truth
rather than assume it failed. Snapshot-restore is only safe for an explicit `!res.ok` (server
rolled back). Encode that: `!res.ok` → snapshot; `catch` → refetch.

### 6d. Reconciliation with peers (already 90% built)
Keep the existing `state` broadcast → `refetch()` and the 8s safety poll. They call `setView(server)`
which *is* reconciliation. One addition: when a refetch lands, **do not** clear pending keys (a
peer's echo isn't my confirmation) — only my own `run()` response clears my key. This prevents a
peer's broadcast from prematurely ending my spinner.

### 6e. Duplicate prevention
- `run()` early-returns if `pending[key]` (covers rapid double-clicks even before React disables).
- Every control passes `disabled={isPending(key) || <rule>}` (replaces the global `busy`).
- The server is already idempotent-ish per turn (illegal repeat → `{error}`, no write), so a slipped
  double-submit is safe; this is UX polish, not a correctness dependency.

### 6f. Money & transaction feedback (fast, not flashy)
- A tiny `<Amount value={cash} />` that **counts** from previous→next over ~250ms
  (`requestAnimationFrame`, `prefers-reduced-motion` → snap). Use it for player cash + pot.
- On a confirmed money change that isn't obvious on screen (e.g. rent you *received* while it wasn't
  your turn), show a **compact toast**: `+₹580 rent · Jaipur`. No toast for changes the player just
  caused and can see (buy, develop) — the number moving is the feedback.
- Direction cue: brief green tick-up / red tick-down class on the animating number.

### 6g. Loading matrix (use the right one)
| Situation | Mechanism |
|---|---|
| Any button action mid-flight | **in-button circular spinner** + label optional ("Buying…"), control disabled |
| Roll | **dice tumble** animation while pending; real faces on response (already have the tumble) |
| Optimistic overlay awaiting confirm | **subtle pending marker** on the changed element (e.g. faint pulse / dotted outline on the just-bought tile, dimmed cash until confirmed) |
| First mount of a panel that fetches | **skeleton** matching final shape — *none needed today* (SSR `initialView`); add only if a future panel client-fetches |
| Whole game truly unusable | full-screen — **avoid**; there is no such state today |
Never: skeletons for millisecond mutations; giant spinners for local state; a global overlay for a
one-button action.

### 6h. Skeletons (perceived performance)
Today the board, players, your-info, and log all render from `initialView` (SSR) — **no skeleton
needed**. If any panel later fetches on the client (e.g. a lazy "match history" drawer), give it a
skeleton sized to the real card (avoid layout shift). Do **not** add skeletons that flash on every
mutation.

---

## 7. Per-operation implementation notes

- **Roll** — the dice `Dice`/tumble already exists. On click: set `roll` pending, disable Roll,
  keep tumbling; on response the real `lastRoll` shows and the token has moved. Do **not** predict
  the move. This already *feels* instant with the tumble — just add the per-key disable.
- **Buy** — overlay is exact and low-risk (nobody else can buy the tile you're on). Apply overlay,
  close the deed immediately, confirm invisibly. Keep the existing "can't afford → disabled".
- **Develop** — overlay per city; the spinner sits on that city's Develop button in the deed /
  My-Properties, not globally. Even-build/max errors revert + toast.
- **Mortgage/Unmortgage** — overlay flips the flag + cash instantly; the tile's mortgaged styling
  updates at once.
- **Sell** — **confirm first** (small inline confirm on the Sell button: click → "Sell ₹X?" → click
  to commit), *then* overlay. Irreversible per rules, so the confirm is the safety; after commit,
  optimism is fine (your property, low MP risk).
- **collect_rent** — overlay your cash up by the *pending* amount and drop the chip immediately, but
  treat the amount as provisional: the server may pay less (payer force-liquidated) or void it
  (city traded/sold). The authoritative view corrects it; if it changed, a small toast explains.
- **Restructure** — overlay cash += advance; the button then hides (`youCanRestructure` false on the
  next view).
- **Trades (propose/counter/respond/withdraw)** — **withdraw** is safely optimistic (remove your
  row). **propose/counter** → optional review step, then a *pending-sent* row (never "accepted").
  **respond/accept** is high-MP-risk and semi-irreversible → confirm, then **pending** (let the
  server transfer + re-validate; the trade may have gone stale). **decline** may optimistically
  remove the incoming card.
- **leave_game** — blocking confirm dialog ("Leave the game? Your assets return to the bank."), then
  pending; the server's `leaveGame` does a lot (voids trades/rents, returns assets, may end the
  game), so don't predict — just show pending and reconcile.
- **bid** — overlay only `auction.bidded[you]=true` (so your control locks and shows "bid in"),
  outcome pending; other seats bid concurrently (high MP risk) so never predict the winner.

---

## 8. Failure & rollback (never leave a lie on screen)
- `!res.ok` (server rolled back) → `setView(snapshot)` + concise error toast keyed to the control
  (e.g. "Not enough cash" / "It's not your turn"). Offer **Retry** for network-class errors, not for
  rule errors (retrying an illegal move is pointless — explain instead).
- `catch` (network/timeout, ambiguous) → **`refetch()`** to re-sync to authoritative truth (do not
  assume failure), then if still inconsistent show a soft "reconnecting…" and let the safety poll
  catch up.
- Map raw engine errors → human copy in one `humanError()` table (`insufficient_funds` → "Not enough
  cash", `not_your_turn` → "Wait for your turn", `uneven_build` → "Build evenly across the zone",
  `sell_upgrades_first` → "Sell the buildings first", etc.).
- The rest of the game stays interactive during a single action's error (only that key was pending).

---

## 9. Multiplayer conflict scenarios to get right
- **Peer broadcast mid-optimism:** base view refreshes; my overlay recomputes on the new base only
  while my op is still pending; my response then supersedes. Net: no stale overwrite.
- **Rent chip collected by auto-settle before I click:** my `collect_rent` overlay finds no matching
  `pendingRent` after the refresh → patch returns `null` → the (now gone) chip is simply absent; a
  server `{error: "no_such_rent"}` is mapped to a benign "Already settled".
- **Trade target's assets change before accept:** never optimistically transferred → server
  re-validates → `{error: trade_invalid}` → toast "Offer no longer valid", card removed by the
  authoritative view.
- **Two players bid the same auction:** only the `bidded[you]` flag is optimistic; winner comes from
  the server.
- **Turn advances (peer auto-resolved) while my deed modal is open:** the authoritative view flips
  `active`/`phase`; my action then `{error: not_your_turn}` and reverts. Consider disabling
  now-illegal controls the moment `active !== you`.

---

## 10. Acceptance checklist (test each)
- [ ] **Normal success** — action reflects instantly; no visible spinner for optimistic ops beyond a
      subtle pending marker; number animates.
- [ ] **Slow network** — overlay shows immediately; pending marker persists until confirm; UI never
      blocks other controls.
- [ ] **Double / rapid click** — second click ignored; exactly one server write.
- [ ] **Rule failure** (`insufficient_funds`, `not_your_turn`, `uneven_build`) — reverts to
      snapshot, clear human error, no retry offered for rule errors.
- [ ] **Network failure / timeout** — refetch re-syncs to authoritative; no phantom state.
- [ ] **Stale state** — peer broadcast during my optimism doesn't get overwritten; my op still
      reconciles.
- [ ] **Multiplayer conflict** — collect a rent that was auto-settled; accept a trade that went
      stale; bid an auction someone else also bids.
- [ ] **Rapid consecutive actions** — mortgage → develop → sell in a row; each has its own pending
      key; final state matches the authoritative view.
- [ ] **Remount during pending** (navigate away/back, or React refresh) — no crash; the fresh SSR
      view is authoritative; no ghost pending.
- [ ] **prefers-reduced-motion** — number animations + dice tumble snap instead of animate.

---

## 11. File-by-file change list (where to wire it)
1. **New:** `src/components/vyapaar/optimistic.ts` — `actionKey`, `optimisticPatch`, `sellValue`,
   `humanError` (pure; unit-testable, DB-free).
2. **New:** `src/components/vyapaar/useMatchActions.ts` — the hook in §6c (owns pending/overlay/
   revert). Add a `<CountUpAmount>` and a tiny toast (reuse an existing toast system if present —
   **check `src/components/**` for a toast/modal before adding one**; there is a shared modal
   pattern in the app, prefer it).
3. **Edit:** `MatchBoard.tsx` — replace `send`/global `busy` with `run`/`isPending(key)`; thread
   `isPending`/`run` into `Deed`, `TradeCard`, `TradePropose`, `BidControl`, the rent + restructure
   buttons; swap raw cash spans for `<CountUpAmount>`; render the keyed error toast + Retry.
4. **Keep as-is:** the realtime effect + 8s safety poll + presence (they already provide
   reconciliation). Only change: don't clear pending keys on a peer refetch (§6d).
5. **Tests:** `tests/vyapaar/optimistic.test.ts` — `optimisticPatch` for buy/develop/mortgage/
   unmortgage/sell/collect_rent/withdraw_trade/bid produces the exact numbers the engine would
   (cross-check against `CITIES`/`upgradeCost`/formulas); `actionKey` uniqueness; `humanError` map.

---

## 12. Guardrails (do NOT)
- Do **not** add a spinner to every button by default — most safe ops show the moved number, not a
  spinner.
- Do **not** optimistically resolve RNG, auction winners, trade acceptance, or post-liquidation rent.
- Do **not** persist optimistic state anywhere but the render overlay.
- Do **not** clear a pending key on a peer broadcast — only on my own response.
- Do **not** show "Success!" popups for routine ops — the UI changing *is* the success.
- Do **not** block the whole board for a single action — pending is per-key.

**North star:** the game always looks like it's moving forward. The player sees their action
accepted the instant they click, watches the relevant number/tile respond, and only meets an error
when something genuinely failed — at which point the UI honestly reverts and explains.
