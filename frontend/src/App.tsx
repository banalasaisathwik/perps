import "./App.css";
import { DashboardHeader } from "./components/DashboardHeader";
import { OrderBookPanel } from "./components/OrderBookPanel";
import { OrderFormPanel } from "./components/OrderFormPanel";
import { ServiceMap } from "./components/ServiceMap";
import { TimelinePanel } from "./components/TimelinePanel";
import { DISPLAY_SYMBOL } from "./data/orderBookSeed";
import { useDashboardRuntime } from "./hooks/useDashboardRuntime";

function App() {
  // One hook owns all live behavior; this component only arranges UI sections.
  const dashboard = useDashboardRuntime();

  return (
    <main className="dashboard-shell">
      <DashboardHeader
        backendStatus={dashboard.backendStatus}
        botRunning={dashboard.botRunning}
        wsStatus={dashboard.wsStatus}
      />

      <ServiceMap activeFlow={dashboard.activeFlow} />

      <section className="trade-grid">
        {/* Render-only panels receive already-prepared values and callbacks from the hook. */}
        <OrderBookPanel
          askTotals={dashboard.askTotals}
          bidTotals={dashboard.bidTotals}
          displaySymbol={DISPLAY_SYMBOL}
          midPrice={dashboard.midPrice}
          spread={dashboard.spread}
        />

        <OrderFormPanel
          displaySymbol={DISPLAY_SYMBOL}
          leverage={dashboard.leverage}
          onLeverageChange={dashboard.setLeverage}
          onPlaceOrder={dashboard.placeOrder}
          onPriceChange={dashboard.setPrice}
          onQtyChange={dashboard.setQty}
          onSetBestAsk={dashboard.setBestAsk}
          onSetBestBid={dashboard.setBestBid}
          onSideChange={dashboard.setSide}
          onTokenChange={dashboard.setToken}
          onToggleBot={dashboard.toggleBot}
          onTypeChange={dashboard.setOrderType}
          orderType={dashboard.orderType}
          price={dashboard.price}
          qty={dashboard.qty}
          side={dashboard.side}
          token={dashboard.token}
        />
      </section>

      <TimelinePanel
        events={dashboard.timeline}
        onClear={dashboard.clearTimeline}
      />
    </main>
  );
}

export default App;
