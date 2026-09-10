type MarketHeaderProps = {
  displaySymbol: string;
  markPrice: number | null;
};

export function MarketHeader({ displaySymbol, markPrice }: MarketHeaderProps) {
  return (
    <section className="market-header" aria-label="Market summary">
      <div className="market-symbol"><small>PERPETUAL</small><b>{displaySymbol}</b></div>
      <div><small>MARK PRICE</small><b>{markPrice === null ? "--" : markPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b></div>
    </section>
  );
}
