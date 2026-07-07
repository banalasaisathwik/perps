import type React from "react";
import type { OrderType, Side } from "../types/dashboard";

type OrderFormPanelProps = {
  displaySymbol: string;
  leverage: string;
  onLeverageChange: (value: string) => void;
  onPlaceOrder: (e: React.FormEvent) => void;
  onPriceChange: (value: string) => void;
  onQtyChange: (value: string) => void;
  onSetBestAsk: () => void;
  onSetBestBid: () => void;
  onSideChange: (side: Side) => void;
  onTokenChange: (value: string) => void;
  onToggleBot: (start: boolean) => void;
  onTypeChange: (type: OrderType) => void;
  orderType: OrderType;
  price: string;
  qty: string;
  side: Side;
  token: string;
};

export function OrderFormPanel({
  displaySymbol,
  leverage,
  onLeverageChange,
  onPlaceOrder,
  onPriceChange,
  onQtyChange,
  onSetBestAsk,
  onSetBestBid,
  onSideChange,
  onTokenChange,
  onToggleBot,
  onTypeChange,
  orderType,
  price,
  qty,
  side,
  token,
}: OrderFormPanelProps) {
  return (
    <div className="panel order-form-panel">
      <div className="panel-title">
        <span className="step-badge">3</span>
        <span>Order Form</span>
      </div>

      <form onSubmit={onPlaceOrder} className="order-form">
        <label>
          Symbol
          <input value={displaySymbol} readOnly />
        </label>

        <label>
          Order Type
          <div className="segmented">
            <button
              // The selected class is visual state; the actual state lives in useDashboardRuntime.
              className={orderType === "limit" ? "selected" : ""}
              type="button"
              onClick={() => onTypeChange("limit")}
            >
              Limit
            </button>
            <button
              className={orderType === "market" ? "selected" : ""}
              type="button"
              onClick={() => onTypeChange("market")}
            >
              Market
            </button>
          </div>
        </label>

        <label>
          Side
          <div className="segmented">
            <button
              // Backend expects "long" / "short"; the UI labels translate that into trader language.
              className={side === "long" ? "selected buy" : ""}
              type="button"
              onClick={() => onSideChange("long")}
            >
              Buy / Long
            </button>
            <button
              className={side === "short" ? "selected sell" : ""}
              type="button"
              onClick={() => onSideChange("short")}
            >
              Sell / Short
            </button>
          </div>
        </label>

        {/* Market orders do not need a user-entered price; the engine chooses from book liquidity. */}
        {orderType === "limit" && (
          <label>
            Price
            <input
              inputMode="decimal"
              value={price}
              onChange={(e) => onPriceChange(e.target.value)}
            />
          </label>
        )}

        <label>
          Quantity
          <input
            inputMode="decimal"
            value={qty}
            onChange={(e) => onQtyChange(e.target.value)}
          />
        </label>

        <label>
          Leverage
          <input
            inputMode="decimal"
            value={leverage}
            onChange={(e) => onLeverageChange(e.target.value)}
          />
        </label>

        <div className="form-actions">
          <button className="btn btn-primary" type="submit">
            {/* Text follows the current order type, but submit handler stays the same. */}
            Place {orderType === "limit" ? "Limit" : "Market"}
          </button>
          <button className="btn btn-danger" type="button" onClick={() => onToggleBot(false)}>
            Stop Bot
          </button>
          <button className="btn btn-ghost" type="button" onClick={() => onToggleBot(true)}>
            Start Bot
          </button>
          <button className="btn btn-ghost green-outline" type="button" onClick={onSetBestBid}>
            Set best bid
          </button>
          <button className="btn btn-ghost red-outline" type="button" onClick={onSetBestAsk}>
            Set best ask
          </button>
        </div>

        <label className="token-field">
          Auth token optional
          <input value={token} onChange={(e) => onTokenChange(e.target.value)} />
        </label>
      </form>
    </div>
  );
}
