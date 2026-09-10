import type { OpenOrder } from "../types/dashboard";

type OpenOrdersPanelProps = { onCancel: (orderId: string) => void; orders: OpenOrder[] };

export function OpenOrdersPanel({ onCancel, orders }: OpenOrdersPanelProps) {
  return (
    <section className="card open-orders-panel" aria-labelledby="orders-heading">
      <div className="card-head"><b id="orders-heading">Open Orders</b><small>resting orders</small></div>
      {orders.length === 0 ? <p className="empty-state">No open orders for BTC / USDT.</p> : (
        <div className="table-scroll"><table><thead><tr><th>SIDE</th><th>TYPE</th><th>PRICE</th><th>REMAINING</th><th /></tr></thead><tbody>{orders.map((order) => <tr key={order.orderId}><td className={order.side}>{order.side.toUpperCase()}</td><td>{order.type.toUpperCase()}</td><td>{order.price?.toLocaleString(undefined, { minimumFractionDigits: 2 }) ?? "MARKET"}</td><td>{(order.qty - order.filledQty).toFixed(3)}</td><td><button className="subtle-button" type="button" onClick={() => onCancel(order.orderId)}>Cancel</button></td></tr>)}</tbody></table></div>
      )}
    </section>
  );
}
