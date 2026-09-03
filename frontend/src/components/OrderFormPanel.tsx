import type React from "react";
import type { OrderType, Side } from "../types/dashboard";

type OrderFormPanelProps = {
  authStatus: "pending" | "ready" | "error";
  displaySymbol: string;
  leverage: string;
  onLeverageChange: (value: string) => void;
  onPlaceOrder: (e: React.FormEvent) => void;
  onPriceChange: (value: string) => void;
  onQtyChange: (value: string) => void;
  onSetBestAsk: () => void;
  onSetBestBid: () => void;
  onSideChange: (side: Side) => void;
  onToggleBot: (start: boolean) => void;
  onTypeChange: (type: OrderType) => void;
  orderType: OrderType;
  price: string;
  qty: string;
  side: Side;
  username: string;
};

export function OrderFormPanel({
  authStatus,
  displaySymbol,
  leverage,
  onLeverageChange,
  onPlaceOrder,
  onPriceChange,
  onQtyChange,
  onSetBestAsk,
  onSetBestBid,
  onSideChange,
  onToggleBot,
  onTypeChange,
  orderType,
  price,
  qty,
  side,
  username,
}: OrderFormPanelProps) {
  return (
    <div className="panel order-form-panel">
      <div className="panel-title">
        <span className="step-badge">3</span>
        <span>Place your trade</span>
      </div>

      <form onSubmit={onPlaceOrder} className="order-form">
        <label>
          Symbol
          <input value={displaySymbol} readOnly />
        </label>

        <label>
          How to buy or sell
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
          <button className="btn btn-primary" type="submit" disabled={authStatus !== "ready"}>
            {/* Text follows the current order type, but submit handler stays the same. */}
            Review and place order
          </button>
          <button className="btn btn-danger" type="button" onClick={() => onToggleBot(false)}>
            Pause price bot
          </button>
          <button className="btn btn-ghost" type="button" onClick={() => onToggleBot(true)}>
            Start price bot
          </button>
          <button className="btn btn-ghost green-outline" type="button" onClick={onSetBestBid}>
            Use best buy price
          </button>
          <button className="btn btn-ghost red-outline" type="button" onClick={onSetBestAsk}>
            Use best sell price
          </button>
        </div>

        <p className="token-field auth-status">
          {authStatus === "pending" && "Signing in..."}
          {authStatus === "ready" && `Signed in as ${username}`}
          {authStatus === "error" && "Sign-in failed — retry by reloading"}
        </p>
      </form>
    </div>
  );
}
