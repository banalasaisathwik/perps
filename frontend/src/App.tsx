import "./App.css";
import { DashboardHeader } from "./components/DashboardHeader";
import { MarketHeader } from "./components/MarketHeader";
import { OpenOrdersPanel } from "./components/OpenOrdersPanel";
import { OrderBookPanel } from "./components/OrderBookPanel";
import { OrderFormPanel } from "./components/OrderFormPanel";
import { PositionsPanel } from "./components/PositionsPanel";
import { ServiceMap } from "./components/ServiceMap";
import { DISPLAY_SYMBOL } from "./data/orderBookSeed";
import { useDashboardRuntime } from "./hooks/useDashboardRuntime";

function App() {
  const dashboard = useDashboardRuntime();
  return <main className="dashboard-shell">
    <DashboardHeader />
    <MarketHeader balance={dashboard.balance} displaySymbol={DISPLAY_SYMBOL} equity={dashboard.equity} markPrice={dashboard.displayedMark} />
    <ServiceMap activity={dashboard.architectureActivity} />
    <section className="main-grid">
      <div className="left-stack"><PositionsPanel bestAsk={dashboard.bestAsk} bestBid={dashboard.bestBid} markPrice={dashboard.displayedMark} positions={dashboard.positions} onClose={dashboard.closePosition} /><OpenOrdersPanel orders={dashboard.openOrders} onCancel={dashboard.cancelOpenOrder} /></div>
      <OrderBookPanel askTotals={dashboard.askTotals} bidTotals={dashboard.bidTotals} displaySymbol={DISPLAY_SYMBOL} markPrice={dashboard.displayedMark} recentOrder={dashboard.recentOrder} spread={dashboard.spread} />
      <OrderFormPanel authError={dashboard.authError} authStatus={dashboard.authStatus} balance={dashboard.balance} botMessage={dashboard.botMessage} botRunning={dashboard.botRunning} displaySymbol={DISPLAY_SYMBOL} leverage={dashboard.leverage} markPrice={dashboard.markPrice} onAuthenticate={dashboard.authenticate} onLeverageChange={dashboard.setLeverage} onPlaceOrder={dashboard.placeOrder} onPriceChange={dashboard.setPrice} onQtyChange={dashboard.setQty} onSideChange={dashboard.setSide} onToggleBot={dashboard.toggleBot} onTypeChange={dashboard.setOrderType} orderMessage={dashboard.orderMessage} orderStatus={dashboard.orderStatus} orderType={dashboard.orderType} positions={dashboard.positions} price={dashboard.price} qty={dashboard.qty} side={dashboard.side} username={dashboard.username} />
    </section>
  </main>;
}

export default App;
