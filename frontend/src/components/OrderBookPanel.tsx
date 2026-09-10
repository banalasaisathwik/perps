import type { LevelWithTotal, RecentOrder } from "../types/dashboard";

type OrderBookPanelProps = {
  askTotals: LevelWithTotal[];
  bidTotals: LevelWithTotal[];
  displaySymbol: string;
  markPrice: number | null;
  recentOrder: RecentOrder | null;
  spread: string;
};

function isHighlighted(prices: number[], price: number) {
  return prices.some((candidate) => Math.abs(candidate - price) < 0.0001);
}

function BookRows({ levels, side, highlights }: { levels: LevelWithTotal[]; side: "ask" | "bid"; highlights: number[] }) {
  const maxTotal = Math.max(...levels.map((level) => level.total), 1);
  return (
    <>{levels.map((level) => (
      <div className={`book-row ${side} ${isHighlighted(highlights, level.price) ? "order-glow" : ""}`} key={level.price}>
        <i className="depth-bar" style={{ width: `${(level.total / maxTotal) * 100}%` }} />
        <span>{level.price.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
        <span>{level.qty.toFixed(3)}</span><span>{level.total.toFixed(3)}</span>
      </div>
    ))}</>
  );
}

export function OrderBookPanel({ askTotals, bidTotals, displaySymbol, markPrice, recentOrder, spread }: OrderBookPanelProps) {
  const waitingPrice = recentOrder?.status === "open" ? recentOrder.requestedPrice : null;
  const askHighlights = recentOrder?.side === "long" ? recentOrder.fillPrices : recentOrder?.side === "short" && waitingPrice !== null ? [waitingPrice] : [];
  const bidHighlights = recentOrder?.side === "short" ? recentOrder.fillPrices : recentOrder?.side === "long" && waitingPrice !== null ? [waitingPrice] : [];
  const shownPrice = markPrice ?? null;

  return (
    <section className="card order-book-panel" aria-labelledby="order-book-heading">
      <div className="card-head"><b id="order-book-heading">Order Book</b><small className="right">{displaySymbol}</small></div>
      <div className="book-columns"><span>PRICE</span><span>SIZE</span><span>TOTAL</span></div>
      <BookRows levels={askTotals} side="ask" highlights={askHighlights} />
      <div className="book-mid"><strong>{shownPrice === null ? "--" : shownPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong><small>Mark price · Spread {spread}</small></div>
      <BookRows levels={bidTotals} side="bid" highlights={bidHighlights} />
      {askTotals.length === 0 && bidTotals.length === 0 && <p className="empty-book">No live levels yet</p>}
    </section>
  );
}
