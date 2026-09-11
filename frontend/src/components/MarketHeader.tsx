import type { Balance } from "../types/dashboard";

type MarketHeaderProps = {
  balance: Balance | null;
  displaySymbol: string;
  equity: number | null;
  markPrice: number | null;
};

function money(value: number | null) {
  return value === null ? "--" : value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function MarketHeader({ balance, displaySymbol, equity, markPrice }: MarketHeaderProps) {
  return (
    <section className="market-header" aria-label="Market summary">
      <div className="market-symbol"><small>PERPETUAL</small><b>{displaySymbol}</b></div>
      <div><small>MARK PRICE</small><b>{money(markPrice)}</b></div>
      <div><small>AVAILABLE</small><b>{money(balance?.available ?? null)}</b></div>
      <div><small>LOCKED</small><b>{money(balance?.locked ?? null)}</b></div>
      <div><small>EQUITY</small><b>{money(equity)}</b></div>
    </section>
  );
}
