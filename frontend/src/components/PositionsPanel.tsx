import type { Position } from "../types/dashboard";

type PositionsPanelProps = {
  markPrice: number | null;
  onClose: (position: Position) => void;
  positions: Position[];
};

function money(value: number | null) {
  return value === null ? "--" : value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function PositionsPanel({ markPrice, onClose, positions }: PositionsPanelProps) {
  return (
    <section className="card positions-panel" aria-labelledby="positions-heading">
      <div className="card-head"><b id="positions-heading">Your Positions</b><small>open positions</small><small className="right">{positions.length} active</small></div>
      {positions.length === 0 ? <p className="empty-state">No open positions.</p> : (
        <div className="table-scroll"><table><thead><tr><th>SYMBOL</th><th>SIDE</th><th>SIZE</th><th>ENTRY</th><th>MARK</th><th>LIQ.</th><th>PNL</th><th /></tr></thead>
          <tbody>{positions.map((position) => {
            const pnl = markPrice === null ? null : (position.side === "long" ? markPrice - position.averagePrice : position.averagePrice - markPrice) * position.qty;
            return <tr key={position.orderId}><td>{position.symbol}</td><td className={position.side}>{position.side.toUpperCase()} {position.leverage}×</td><td>{position.qty.toFixed(3)}</td><td>{money(position.averagePrice)}</td><td>{money(markPrice)}</td><td>{money(position.liquidationPrice)}</td><td className={pnl === null ? "" : pnl >= 0 ? "positive" : "negative"}>{pnl === null ? "--" : `${pnl >= 0 ? "+" : ""}${money(pnl)}`}</td><td><button className="subtle-button" type="button" onClick={() => onClose(position)}>Close</button></td></tr>;
          })}</tbody>
        </table></div>
      )}
    </section>
  );
}
