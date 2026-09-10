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

function latestOrderText(order: RecentOrder) {
  const action = order.side === "long" ? "Long" : "Short";
  if (order.status === "open") {
    return `${action} order accepted and waiting in the book.`;
  }
  if (order.status === "filled") {
    return `${action} order filled: ${order.filledQty.toFixed(3)} BTC.`;
  }
  if (order.status === "partially_filled") {
    return `${action} order partly filled: ${order.filledQty.toFixed(3)} BTC.`;
  }
  return `${action} order cancelled by the engine.`;
}

type BookTableProps = {
  levels: LevelWithTotal[];
  side: "asks" | "bids";
  highlightPrices: number[];
};

function BookTable({ highlightPrices, levels, side }: BookTableProps) {
  const isAsk = side === "asks";
  return (
    <div className={`book ${isAsk ? "sell" : "buy"}`}>
      <div className="book-head"><b>{isAsk ? "Sell Orders" : "Buy Orders"}</b><small>{isAsk ? "ASKS" : "BIDS"}</small></div>
      <div className="book-columns"><span>Price</span><span>Size</span><span>Total</span></div>
      <div className="book-levels">
        {levels.length === 0 ? (
          <p className="empty-book">No live levels</p>
        ) : levels.map((level) => (
          <div key={level.price} className={`book-level ${hasExactPrice(highlightPrices, level.price) ? "order-glow" : ""}`}>
            <span>{level.price.toFixed(1)}</span>
            <span>{level.qty.toFixed(3)}</span>
            <span>{level.total.toFixed(3)}</span>
          </div>
        ))}
      </div>
    </div>
  );
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
  const waiting = recentOrder?.status === "open";
  const matched = recentOrder?.status === "filled" || recentOrder?.status === "partially_filled";
  const highlightBids = !recentOrder ? [] : waiting && recentOrder.side === "long" && recentOrder.requestedPrice !== null
    ? [recentOrder.requestedPrice]
    : matched && recentOrder.side === "short" ? recentOrder.fillPrices : [];
  const highlightAsks = !recentOrder ? [] : waiting && recentOrder.side === "short" && recentOrder.requestedPrice !== null
    ? [recentOrder.requestedPrice]
    : matched && recentOrder.side === "long" ? recentOrder.fillPrices : [];

  return (
    <section className="card order-book-panel" aria-labelledby="order-book-heading">
      <div className="card-head">
        <b id="order-book-heading">{displaySymbol} Order Book</b>
        <small className="right">Mark {markPrice?.toFixed(1) ?? "--"} · Spread {spread}</small>
      </div>

      <div className="books">
        <BookTable levels={askTotals} side="asks" highlightPrices={highlightAsks} />
        <BookTable levels={bidTotals} side="bids" highlightPrices={highlightBids} />
      </div>

      <div className="spread-row">
        <span>Best Ask <b className="ask-value">{askTotals.at(-1)?.price.toFixed(1) ?? "--"}</b></span>
        <span>Mid <b>{midPrice}</b></span>
        <span>Best Bid <b className="bid-value">{bidTotals[0]?.price.toFixed(1) ?? "--"}</b></span>
      </div>

      {recentOrder && <p className={`latest-order ${recentOrder.status}`} role="status">{latestOrderText(recentOrder)}</p>}
    </section>
  );
}
