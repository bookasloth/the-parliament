import { CITIES, COMPANIES, upgradeCost, SET_MULT, PAIR_MULT, DEV_MULT } from "@/modules/vyapaar/engine/data"
import type { PublicView } from "@/modules/vyapaar/engine/view"

const ZONE_NAME = ["North", "South", "East", "West", "Central"]
// Slightly darker per-zone hues used for the OUTLINE pills (border + text) so every
// colour — the central yellow especially — stays readable on the white cell.
const ZONE_LINE = ["#FE5100", "#2F9E57", "#EE3C7C", "#1E8BE0", "#C79500"]
const SEAT_COL = ["#269CEF", "#FFCC1C", "#4AB765", "#FF4D93", "#FE5100", "#8b6fd0"]
const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN")

function controlsSet(view: PublicView, seat: number, zone: number): boolean {
  let n = 0
  view.cities.forEach((c, id) => { if (CITIES[id].zone === zone && c.owner === seat && !c.mortgaged) n++ })
  return n >= 3
}

type Row = {
  seat: number; name: string; cash: number; netWorth: number
  cities: { id: number }[]; companies: number[]
  props: number; comps: number; dev: number; sets: number; houses: number; hotels: number
}

function build(view: PublicView): Row[] {
  const rows = view.players.map((p, seat) => {
    const cities = view.cities.map((c, id) => ({ c, id })).filter((x) => x.c.owner === seat)
    const companies = view.companies.map((o, ci) => ({ o, ci })).filter((x) => x.o === seat).map((x) => x.ci)
    const props = cities.reduce((s, { c, id }) => s + (c.mortgaged ? Math.round(CITIES[id].price * 0.5) : Math.round(CITIES[id].price * (controlsSet(view, seat, CITIES[id].zone) ? SET_MULT : 1))), 0)
    const dev = cities.reduce((s, { c, id }) => s + Math.round(c.level * upgradeCost(id) * DEV_MULT), 0)
    const comps = companies.reduce((s, ci) => s + Math.round(COMPANIES[ci].buy * (view.companies[COMPANIES[ci].partner] === seat ? PAIR_MULT : 1)), 0)
    const sets = ZONE_NAME.reduce((n, _, z) => n + (controlsSet(view, seat, z) ? 1 : 0), 0)
    const houses = cities.reduce((n, { c }) => n + (c.level <= 3 ? c.level : 0), 0)
    const hotels = cities.reduce((n, { c }) => n + Math.max(0, c.level - 3), 0)
    return { seat, name: p.name, cash: p.cash, netWorth: p.netWorth, cities: cities.map(({ id }) => ({ id })), companies, props, comps, dev, sets, houses, hotels }
  })
  return rows.sort((a, b) => b.netWorth - a.netWorth)
}

const MEDAL = ["🥇", "🥈", "🥉"]

export function MatchResults({ view, playerImages = [] }: { view: PublicView; playerImages?: (string | null)[] }) {
  const rows = build(view)
  const win = rows[0]

  const cityPill = (id: number) => {
    const z = CITIES[id].zone
    const c = view.cities[id]
    return (
      <span key={id} className="vr-pill" style={{ color: ZONE_LINE[z] }}>
        {CITIES[id].name}{c.level > 0 ? <b className="vr-lvl">{c.level > 3 ? "🏨" : "🏠"}{c.level}</b> : c.mortgaged ? <b className="vr-lvl">✕</b> : null}
      </span>
    )
  }

  return (
    <div className="vr">
      <style>{CSS}</style>

      <header className="vr-head">
        <div className="vr-crown">🏆</div>
        <div>
          <div className="vr-lab">Winner</div>
          <h2 className="vr-win">{win.name}</h2>
          <div className="vr-sub">{win.cities.length} cities · {win.sets} {win.sets === 1 ? "set" : "sets"}{win.companies.length ? ` · ${win.companies.length} companies` : ""}{win.houses + win.hotels ? ` · ${win.houses + win.hotels} built` : ""}</div>
        </div>
        <div className="vr-nw"><div className="vr-lab">Net worth</div><div className="vr-nw-v">{inr(win.netWorth)}</div></div>
      </header>

      <div className="vr-scroll">
        <table className="vr-tbl">
          <thead>
            <tr>
              <th className="vr-rl"></th>
              {rows.map((r, i) => (
                <th key={r.seat} className={i === 0 ? "vr-wincol" : ""}>
                  <div className="vr-phd">
                    <span className="vr-rk">{MEDAL[i] ?? i + 1}</span>
                    {playerImages[r.seat]
                      ? <img src={playerImages[r.seat]!} alt="" className="vr-av" />
                      : <span className="vr-av vr-init" style={{ background: SEAT_COL[r.seat % 6], color: r.seat % 6 === 1 ? "#3a2f00" : "#fff" }}>{r.name.charAt(0).toUpperCase()}</span>}
                    <span className="vr-pn">{r.name}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="vr-nwrow">
              <th className="vr-rl">Net worth</th>
              {rows.map((r, i) => <td key={r.seat} className={i === 0 ? "vr-wincol" : ""}>{inr(r.netWorth)}</td>)}
            </tr>
            <tr>
              <th className="vr-rl">Cash</th>
              {rows.map((r, i) => <td key={r.seat} className={`vr-num${i === 0 ? " vr-wincol" : ""}`}>{inr(r.cash)}</td>)}
            </tr>
            <tr>
              <th className="vr-rl">Property</th>
              {rows.map((r, i) => <td key={r.seat} className={`vr-num${i === 0 ? " vr-wincol" : ""}`}>{r.props ? <>{inr(r.props)}<span className="vr-meta">{r.cities.length} · {r.sets} {r.sets === 1 ? "set" : "sets"}</span></> : <span className="vr-dash">—</span>}</td>)}
            </tr>
            <tr>
              <th className="vr-rl">Cities</th>
              {rows.map((r, i) => (
                <td key={r.seat} className={i === 0 ? "vr-wincol" : ""}>
                  {r.cities.length ? <div className="vr-pills">{r.cities.map(({ id }) => cityPill(id))}</div> : <span className="vr-dash">—</span>}
                </td>
              ))}
            </tr>
            <tr>
              <th className="vr-rl">Companies</th>
              {rows.map((r, i) => (
                <td key={r.seat} className={i === 0 ? "vr-wincol" : ""}>
                  {r.companies.length ? <div className="vr-pills">{r.companies.map((ci) => (
                    <span key={ci} className="vr-pill vr-co">{COMPANIES[ci].short}{view.companies[COMPANIES[ci].partner] === r.seat ? <b className="vr-lvl">🔗</b> : null}</span>
                  ))}</div> : <span className="vr-dash">—</span>}
                </td>
              ))}
            </tr>
            <tr>
              <th className="vr-rl">Houses · Hotels</th>
              {rows.map((r, i) => <td key={r.seat} className={`vr-num${i === 0 ? " vr-wincol" : ""}`}>{r.houses + r.hotels ? `${r.houses} · ${r.hotels}` : <span className="vr-dash">—</span>}</td>)}
            </tr>
            <tr>
              <th className="vr-rl">Development</th>
              {rows.map((r, i) => <td key={r.seat} className={`vr-num${i === 0 ? " vr-wincol" : ""}`}>{r.dev ? inr(r.dev) : <span className="vr-dash">—</span>}</td>)}
            </tr>
            <tr>
              <th className="vr-rl">Companies value</th>
              {rows.map((r, i) => <td key={r.seat} className={`vr-num${i === 0 ? " vr-wincol" : ""}`}>{r.comps ? inr(r.comps) : <span className="vr-dash">—</span>}</td>)}
            </tr>
          </tbody>
        </table>
      </div>

      <p className="vr-foot">Net worth = cash + property (full price, ×1.4 for completed sets) + companies (full buy, ×1.4 for a pair) + development (build cost ×1.5). Sell to the bank pays full value − 2% TDS.</p>
    </div>
  )
}

const CSS = `
.vr{--card:#fff;--line:#e6e4de;--line2:#f1eee8;--ink:#14110d;--dim:#6b6a64;--faint:#9a988f;--accent:#FE5100;--gold:#B8860B;--winbg:#fbf6ea;--grey:#5a5f68;
  width:100%;display:flex;flex-direction:column;background:var(--card);border:1px solid var(--line);border-radius:16px;overflow:hidden;font-family:"Poppins",system-ui,sans-serif;color:var(--ink);}
.vr *{box-sizing:border-box;}
.vr-head{display:flex;align-items:center;gap:16px;padding:18px 22px;border-bottom:1px solid var(--line);background:var(--winbg);}
.vr-crown{font-size:1.9rem;line-height:1;}
.vr-lab{font-size:.6rem;font-weight:700;text-transform:uppercase;letter-spacing:.13em;color:var(--gold);}
.vr-win{font-family:"Plus Jakarta Sans","Poppins",sans-serif;font-weight:800;font-size:1.4rem;letter-spacing:-.01em;margin:1px 0 0;}
.vr-sub{font-size:.78rem;color:var(--dim);margin-top:2px;}
.vr-nw{margin-left:auto;text-align:right;}
.vr-nw-v{font-family:"Plus Jakarta Sans","Poppins",sans-serif;font-weight:800;font-size:1.7rem;letter-spacing:-.02em;font-variant-numeric:tabular-nums;line-height:1;}
.vr-scroll{overflow-x:auto;}
.vr-tbl{border-collapse:collapse;width:100%;table-layout:fixed;}
.vr-tbl th,.vr-tbl td{text-align:left;vertical-align:top;padding:11px 13px;border-bottom:1px solid var(--line);}
.vr-tbl tbody tr:last-child th,.vr-tbl tbody tr:last-child td{border-bottom:none;}
.vr-rl{font-size:.6rem;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--dim);white-space:nowrap;width:120px;background:var(--line2);position:sticky;left:0;z-index:1;}
.vr-tbl thead th{border-bottom:2px solid var(--line);position:sticky;top:0;background:var(--card);z-index:2;}
.vr-tbl thead .vr-rl{z-index:3;background:var(--line2);}
.vr-phd{display:flex;align-items:center;gap:8px;min-width:130px;}
.vr-rk{font-family:"Plus Jakarta Sans","Poppins",sans-serif;font-weight:800;font-size:.95rem;font-variant-numeric:tabular-nums;}
.vr-av{width:28px;height:28px;border-radius:7px;object-fit:cover;flex:none;}
.vr-init{display:grid;place-items:center;font-weight:700;font-size:.8rem;}
.vr-pn{font-family:"Plus Jakarta Sans","Poppins",sans-serif;font-weight:700;font-size:.86rem;line-height:1.15;letter-spacing:-.01em;}
.vr-wincol{background:var(--winbg);}
.vr-tbl thead .vr-wincol{box-shadow:inset 0 -2px 0 var(--gold);}
.vr-num{font-variant-numeric:tabular-nums;font-weight:600;font-size:.88rem;}
.vr-nwrow td{font-family:"Plus Jakarta Sans","Poppins",sans-serif;font-weight:800;font-size:1.05rem;letter-spacing:-.01em;font-variant-numeric:tabular-nums;}
.vr-meta{display:block;font-size:.66rem;color:var(--dim);font-weight:500;margin-top:1px;}
.vr-dash{color:var(--faint);}
.vr-pills{display:flex;flex-wrap:wrap;gap:4px;align-items:flex-start;}
.vr-pill{font-size:.71rem;font-weight:600;border-radius:999px;padding:2px 9px;white-space:nowrap;display:inline-flex;align-items:center;gap:5px;background:transparent;border:1.5px solid currentColor;}
.vr-pill.vr-co{color:var(--grey);}
.vr-lvl{font-size:.62rem;font-weight:700;opacity:.95;}
.vr-foot{margin:0;padding:12px 22px 16px;font-size:.7rem;color:var(--faint);line-height:1.5;border-top:1px solid var(--line);background:var(--line2);}
`
