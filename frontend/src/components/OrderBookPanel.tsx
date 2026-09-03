import type { LevelWithTotal, RecentOrder } from "../types/dashboard";

type OrderBookPanelProps = {
  askTotals: LevelWithTotal[];
  bidTotals: LevelWithTotal[];
  displaySymbol: string;
  markPrice: number | null;
  midPrice: string;
  recentOrder: RecentOrder | null;
  spread: string;
};

function hasExactPrice(prices: number[], price: number) {
  return prices.some((candidate) => Math.abs(candidate - price) < 0.0001);
}

function getOrderExplanation(order: RecentOrder, displaySymbol: string) {
  const direction = order.side === "long" ? "Buy" : "Sell";

  if (order.status === "open") {
    return `${direction} order is waiting at ${order.requestedPrice?.toFixed(1)}. The glowing row is your order in the book.`;
  }

  if (order.status === "cancelled") {
    return `${direction} order was not matched. No price row is highlighted.`;
  }

  const filledWord = order.status === "filled" ? "was fully matched" : "was partly matched";
  return `${direction} order ${filledWord}: ${order.filledQty.toFixed(3)} ${displaySymbol}. The glowing row supplied the match.`;
}

export function OrderBookPanel({
  askTotals,
  bidTotals,
  displaySymbol,
  markPrice,
  midPrice,
  recentOrder,
  spread,
}: OrderBookPanelProps) {
  const isWaiting = recentOrder?.status === "open";
  const isMatched = recentOrder?.status === "filled" || recentOrder?.status === "partially_filled";

  // A resting Buy/Long is on bids; a resting Sell/Short is on asks.
  // A matched Buy/Long consumes asks; a matched Sell/Short consumes bids.
  const highlightBids = recentOrder
    ? isWaiting
      ? recentOrder.side === "long" && recentOrder.requestedPrice !== null
        ? [recentOrder.requestedPrice]
        : []
      : isMatched && recentOrder.side === "short"
        ? recentOrder.fillPrices
        : []
    : [];
  const highlightAsks = recentOrder
    ? isWaiting
      ? recentOrder.side === "short" && recentOrder.requestedPrice !== null
        ? [recentOrder.requestedPrice]
        : []
      : isMatched && recentOrder.side === "long"
        ? recentOrder.fillPrices
        : []
    : [];
  const visibleHighlight =
    bidTotals.some((level) => hasExactPrice(highlightBids, level.price)) ||
    askTotals.some((level) => hasExactPrice(highlightAsks, level.price));

  return (
    <section className="panel order-book-panel">
      <div className="panel-title">
        <span className="step-badge">2</span>
        <span>Order book</span>
        <code>{displaySymbol}</code>
      </div>

      <p className="panel-help">
        Buy orders are on the left. Sell orders are on the right. Your latest order glows.
      </p>

      {recentOrder && (
        <div className={`latest-order ${recentOrder.side} ${recentOrder.status}`} role="status">
          <span className="latest-order-label">Your latest order</span>
          <strong>{getOrderExplanation(recentOrder, displaySymbol)}</strong>
          {!visibleHighlight && recentOrder.status !== "cancelled" && (
            <span className="latest-order-detail">
              This price has already moved out of the live book, so the glowing marker records it here.
            </span>
          )}
        </div>
      )}

      <div className="market-strip">
        <div>
          <span>Current price</span>
          <strong>{midPrice}</strong>
        </div>
        <div>
          <span>Difference</span>
          <strong>{spread}</strong>
        </div>
        <div>
          <span>Funding rate</span>
          <strong className="green">+0.0100%</strong>
        </div>
        <div>
          <span>Mark price</span>
          <strong>{markPrice !== null ? markPrice.toFixed(1) : "--"}</strong>
        </div>
      </div>

      <div className="book-sides">
        <table className="book-table">
          <caption>Buy orders waiting</caption>
          <thead>
            <tr>
              <th>Amount</th>
              <th>Price</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {bidTotals.map((bid) => (
              <tr
                key={bid.price}
                className={`bid-row ${hasExactPrice(highlightBids, bid.price) ? "order-glow" : ""}`}
              >
                <td>{bid.qty.toFixed(3)}</td>
                <td>{bid.price.toFixed(1)}</td>
                <td>{bid.total.toFixed(3)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <table className="book-table">
          <caption>Sell orders waiting</caption>
          <thead>
            <tr>
              <th>Amount</th>
              <th>Price</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {askTotals.map((ask) => (
              <tr
                key={ask.price}
                className={`ask-row ${hasExactPrice(highlightAsks, ask.price) ? "order-glow" : ""}`}
              >
                <td>{ask.qty.toFixed(3)}</td>
                <td>{ask.price.toFixed(1)}</td>
                <td>{ask.total.toFixed(3)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}