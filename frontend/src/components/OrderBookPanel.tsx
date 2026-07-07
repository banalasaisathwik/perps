import type { LevelWithTotal } from "../types/dashboard";

type OrderBookPanelProps = {
  askTotals: LevelWithTotal[];
  bidTotals: LevelWithTotal[];
  displaySymbol: string;
  midPrice: string;
  spread: string;
};

export function OrderBookPanel({
  askTotals,
  bidTotals,
  displaySymbol,
  midPrice,
  spread,
}: OrderBookPanelProps) {
  return (
    <div className="panel order-book-panel">
      <div className="panel-title">
        <span className="step-badge">2</span>
        <span>Live Order Book</span>
        <code>{displaySymbol}</code>
      </div>

      <div className="market-strip">
        <div>
          <span>Mark Price</span>
          <strong>{midPrice}</strong>
        </div>
        <div>
          <span>Spread</span>
          <strong>{spread}</strong>
        </div>
        <div>
          <span>Funding</span>
          <strong className="green">+0.0100%</strong>
        </div>
      </div>

      <div className="book-sides">
        <table className="book-table">
          <thead>
            <tr>
              <th>Bid Size</th>
              <th>Price</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {bidTotals.map((bid) => (
              <tr key={bid.price} className="bid-row">
                <td>{bid.qty.toFixed(3)}</td>
                <td>{bid.price.toFixed(1)}</td>
                <td>{bid.total.toFixed(3)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <table className="book-table">
          <thead>
            <tr>
              <th>Ask Size</th>
              <th>Price</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {askTotals.map((ask) => (
              <tr key={ask.price} className="ask-row">
                <td>{ask.qty.toFixed(3)}</td>
                <td>{ask.price.toFixed(1)}</td>
                <td>{ask.total.toFixed(3)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
