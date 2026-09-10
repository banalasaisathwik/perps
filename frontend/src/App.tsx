import "./App.css";
import { DashboardHeader } from "./components/DashboardHeader";
import { OrderBookPanel } from "./components/OrderBookPanel";
import { OrderFormPanel } from "./components/OrderFormPanel";
import { ServiceMap } from "./components/ServiceMap";
import { DISPLAY_SYMBOL } from "./data/orderBookSeed";
import { useDashboardRuntime } from "./hooks/useDashboardRuntime";

function App() {
  // One hook owns all live behavior; this component only arranges UI sections.
  const dashboard = useDashboardRuntime();

  return (
    <main className="dashboard-shell">
      <DashboardHeader
        backendStatus={dashboard.backendStatus}
        wsStatus={dashboard.wsStatus}
      />

      <section className="intro" aria-labelledby="dashboard-title">
        <h1 id="dashboard-title">Perpetual exchange,<br />visible end to end.</h1>
        <p>
          Trade against the live book while the active route shows how your
          order and market data move through the exchange.
        </p>
      </section>

      <ServiceMap activity={dashboard.architectureActivity} />

      <section className="trade-grid">
        {/* Render-only panels receive already-prepared values and callbacks from the hook. */}
        <OrderBookPanel
          askTotals={dashboard.askTotals}
          bidTotals={dashboard.bidTotals}
          displaySymbol={DISPLAY_SYMBOL}
          markPrice={dashboard.markPrice}
          recentOrder={dashboard.recentOrder}
          midPrice={dashboard.midPrice}
          spread={dashboard.spread}
        />

        <OrderFormPanel
          authStatus={dashboard.authStatus}
          authError={dashboard.authError}
          displaySymbol={DISPLAY_SYMBOL}
          leverage={dashboard.leverage}
          onLeverageChange={dashboard.setLeverage}
          onAuthenticate={dashboard.authenticate}
          orderMessage={dashboard.orderMessage}
          orderStatus={dashboard.orderStatus}
          onPlaceOrder={dashboard.placeOrder}
          onPriceChange={dashboard.setPrice}
          onQtyChange={dashboard.setQty}
          onSetBestAsk={dashboard.setBestAsk}
          onSetBestBid={dashboard.setBestBid}
          onSideChange={dashboard.setSide}
          onToggleBot={dashboard.toggleBot}
          onTypeChange={dashboard.setOrderType}
          orderType={dashboard.orderType}
          price={dashboard.price}
          qty={dashboard.qty}
          side={dashboard.side}
          botMessage={dashboard.botMessage}
          botRunning={dashboard.botRunning}
          username={dashboard.username}
        />
      </section>
    </main>
  );
}

export default App;
