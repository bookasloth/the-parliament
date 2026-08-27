import { CITIES, COMPANIES, COMPANY_CATS, COMPANY_POS, ZONES, SET_OWN_NEEDED, upgradeCost } from "./engine/data";
import { CITY_POS } from "./engine/board";
import type { PublicView } from "./engine/view";

// The in-game strategy coach. Pure function of the (fully public) board view → a short,
// ranked list of "what should I do next" tips for the viewing player. No hidden info is
// used — every city owner, level and mortgage flag and every player's cash is already in
// PublicView, so the coach reasons about opponents exactly as a human eyeing the board would.
//
// Kept engine-free and DOM-free so it unit-tests as plain logic. `pos` (when present) is the
// board tile the UI opens on click (the same deed modal every card uses).

export type TipKind = "build" | "swap" | "complete" | "unmortgage" | "company" | "trade-away" | "idle";
export interface Tip {
  kind: TipKind;
  text: string;
  pos?: number; // board position to open on click, if the tip points at a specific tile
  zone?: number; // zone index, for colour accents in the UI
  weight: number; // ranking score (higher = more valuable); stripped before render
}

const MAX_LEVEL = 6; // rent ladder tops out at level 6 (see CityDef.rent)

/** City ids in a zone, in canonical (cheapest-last authored) order. */
function zoneCities(zone: number): number[] {
  const out: number[] = [];
  for (let id = 0; id < CITIES.length; id++) if (CITIES[id].zone === zone) out.push(id);
  return out;
}

/** first name, or "you" for the viewer. */
function who(v: PublicView, seat: number): string {
  if (seat === v.you) return "you";
  return v.players[seat]?.name?.split(" ")[0] ?? "a rival";
}

/** unmortgaged cities `seat` owns in `zone`. */
function ownedInZone(v: PublicView, seat: number, zone: number): number[] {
  return zoneCities(zone).filter((id) => v.cities[id].owner === seat && !v.cities[id].mortgaged);
}

export function coachTips(v: PublicView): Tip[] {
  const you = v.you;
  const cash = v.players[you]?.cash ?? 0;
  const tips: Tip[] = [];
  const active = v.players.map((p, i) => ({ p, i })).filter((x) => !x.p.left && x.i !== you).map((x) => x.i);

  for (let z = 0; z < ZONES.length; z++) {
    const mine = ownedInZone(v, you, z);
    const zoneName = ZONES[z];

    // 1. BUILD — you control the zone; raise the lowest-level city (even-build rule) if affordable.
    if (mine.length >= SET_OWN_NEEDED) {
      const buildable = mine.filter((id) => v.cities[id].level < MAX_LEVEL);
      if (buildable.length) {
        const minLevel = Math.min(...buildable.map((id) => v.cities[id].level));
        const target = buildable.filter((id) => v.cities[id].level === minLevel)
          .sort((a, b) => upgradeCost(a) - upgradeCost(b))[0];
        const cost = upgradeCost(target);
        if (cash >= cost) {
          tips.push({
            kind: "build", zone: z, pos: CITY_POS[target], weight: 100,
            text: `You control ${zoneName} — build on ${CITIES[target].name} (₹${cost.toLocaleString("en-IN")}) to spike the rent.`,
          });
        }
      }
    }

    // 2. SWAP — a mutual double-set trade: you're one short of THIS zone and a rival holds the
    //    piece, while that same rival is one short of another zone and you hold THEIR piece.
    if (mine.length === SET_OWN_NEEDED - 1) {
      const need = zoneCities(z).find((id) => v.cities[id].owner !== you); // a piece you lack
      const holder = need != null ? v.cities[need].owner : null;
      if (need != null && holder != null && holder !== you) {
        // does `holder` have a zone they're one short of, where YOU hold a piece they need?
        for (let z2 = 0; z2 < ZONES.length; z2++) {
          if (z2 === z) continue;
          if (ownedInZone(v, holder, z2).length !== SET_OWN_NEEDED - 1) continue;
          const give = zoneCities(z2).find((id) => v.cities[id].owner === you && !v.cities[id].mortgaged);
          if (give != null) {
            tips.push({
              kind: "swap", zone: z, pos: CITY_POS[need], weight: 95,
              text: `Swap your ${CITIES[give].name} for ${who(v, holder)}'s ${CITIES[need].name} — you'd each complete a set.`,
            });
            break;
          }
        }
      }

      // 3. COMPLETE — one piece short and no mutual swap: name the piece and how to get it.
      const missing = zoneCities(z).filter((id) => v.cities[id].owner !== you || v.cities[id].mortgaged);
      const freeTarget = missing.find((id) => v.cities[id].owner === null);
      if (freeTarget != null) {
        tips.push({
          kind: "complete", zone: z, pos: CITY_POS[freeTarget], weight: 80,
          text: `Grab ${CITIES[freeTarget].name} to lock down the ${zoneName} zone.`,
        });
      } else {
        const rivalTarget = missing.find((id) => v.cities[id].owner != null && v.cities[id].owner !== you);
        if (rivalTarget != null) {
          tips.push({
            kind: "complete", zone: z, pos: CITY_POS[rivalTarget], weight: 78,
            text: `${who(v, v.cities[rivalTarget].owner!)} owns ${CITIES[rivalTarget].name} — trade for it to complete ${zoneName}.`,
          });
        }
      }
    }

    // 4. UNMORTGAGE — a mortgaged city that, once cleared, gives (or restores) zone control.
    const mortgagedMine = zoneCities(z).filter((id) => v.cities[id].owner === you && v.cities[id].mortgaged);
    for (const id of mortgagedMine) {
      if (mine.length + 1 >= SET_OWN_NEEDED) {
        tips.push({
          kind: "unmortgage", zone: z, pos: CITY_POS[id], weight: 60,
          text: `Clear ${CITIES[id].name}'s mortgage to control the ${zoneName} zone.`,
        });
        break;
      }
    }

    // 5. TRADE-AWAY — you're stuck with a lone card in a zone a rival is chasing; cash it into
    //    something useful instead of sitting on a dead single.
    if (mine.length === 1) {
      const chaser = active.find((r) => ownedInZone(v, r, z).length >= SET_OWN_NEEDED - 1);
      if (chaser != null) {
        tips.push({
          kind: "trade-away", zone: z, pos: CITY_POS[mine[0]], weight: 40,
          text: `You hold just 1 ${zoneName} card (${CITIES[mine[0]].name}) and ${who(v, chaser)} wants it — trade it for something you'll use.`,
        });
      }
    }
  }

  // 6. COMPANY PAIR — you own one of a pair, the partner is free; grabbing it doubles the fee.
  for (let ci = 0; ci < COMPANIES.length; ci++) {
    if (v.companies[ci] !== you) continue;
    const partner = COMPANIES[ci].partner;
    if (v.companies[partner] === null) {
      tips.push({
        kind: "company", pos: COMPANY_POS[partner], weight: 55,
        text: `Grab ${COMPANIES[partner].name} to double your ${COMPANY_CATS[COMPANIES[ci].category]} service fees.`,
      });
    }
  }

  tips.sort((a, b) => b.weight - a.weight);
  const top = tips.slice(0, 5);
  if (!top.length) return [{ kind: "idle", text: "Nothing urgent — roll the dice and see where you land.", weight: 0 }];
  return top;
}
