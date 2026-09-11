import type { Position } from "../types/dashboard";
import { effectiveLeverage, formatLeverage } from "../utils/leverage";

type PositionsPanelProps = {
  bestAsk: number | null;
  bestBid: number | null;
  markPrice: number | null;
  onClose: (position: Position) => void;
  positions: Position[];
};

function money(value: number | null) {
  return value === null ? "--" : value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function PositionsPanel({ bestAsk, bestBid, markPrice, onClose, positions }: PositionsPanelProps) {
  return (
    <section className="card positions-panel" aria-labelledby="positions-heading">
      <div className="card-head"><b id="positions-heading">Your Positions</b><small>open positions</small><small className="right">{positions.length} active</small></div>
      {positions.length === 0 ? <p className="empty-state">No open positions.</p> : (
        <div className="table-scroll"><table><thead><tr><th>SYMBOL</th><th>SIDE</th><th>SIZE</th><th>ENTRY</th><th>MARGIN</th><th>LIQ.</th><th>TO LIQ.</th><th>PNL</th><th /></tr></thead>
          <tbody>{positions.map((position) => {
            // PnL is priced off the side of the book a close would actually fill
            // against (bid to sell a long, ask to buy back a short) so this
            // figure agrees with what closing the position will realize.
            const exitPrice = (position.side === "long" ? bestBid : bestAsk) ?? markPrice;
            const pnl = exitPrice === null ? null : (position.side === "long" ? exitPrice - position.averagePrice : position.averagePrice - exitPrice) * position.qty;
            const roe = pnl === null || position.margin <= 0 ? null : (pnl / position.margin) * 100;
            const toLiqPct = markPrice === null ? null : Math.abs(markPrice - position.liquidationPrice) / markPrice * 100;
            const toLiqClass = toLiqPct === null ? "" : toLiqPct < 1 ? "danger" : toLiqPct < 3 ? "negative" : toLiqPct > 10 ? "positive" : "";
            const leverageLabel = formatLeverage(effectiveLeverage(position));
            return <tr key={`${position.symbol}-${position.side}`}><td>{position.symbol}</td><td className={position.side}>{position.side.toUpperCase()}{leverageLabel && ` ${leverageLabel}`}</td><td>{position.qty.toFixed(3)}</td><td>{money(position.averagePrice)}</td><td>{money(position.margin)}</td><td>{money(position.liquidationPrice)}</td><td className={toLiqClass}>{toLiqPct === null ? "--" : `${toLiqPct.toFixed(2)}%`}</td><td className={pnl === null ? "" : pnl >= 0 ? "positive" : "negative"}>{pnl === null ? "--" : `${pnl >= 0 ? "+" : ""}${money(pnl)}${roe === null ? "" : ` (${roe >= 0 ? "+" : ""}${roe.toFixed(2)}%)`}`}</td><td><button className="subtle-button" type="button" onClick={() => onClose(position)}>Close</button></td></tr>;
          })}</tbody>
        </table></div>
      )}
    </section>
  );
}
