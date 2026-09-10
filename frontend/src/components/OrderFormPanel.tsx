import { useState, type FormEvent } from "react";
import type { OrderType, Side } from "../types/dashboard";

type OrderFormPanelProps = {
  authError: string;
  authStatus: "idle" | "pending" | "ready" | "error";
  botMessage: string;
  botRunning: boolean;
  displaySymbol: string;
  leverage: string;
  onAuthenticate: (action: "signin" | "signup", username: string, password: string) => void;
  onLeverageChange: (value: string) => void;
  onPlaceOrder: (event: FormEvent) => void;
  onPriceChange: (value: string) => void;
  onQtyChange: (value: string) => void;
  onSetBestAsk: () => void;
  onSetBestBid: () => void;
  onSideChange: (side: Side) => void;
  onToggleBot: (start: boolean) => void;
  onTypeChange: (type: OrderType) => void;
  orderMessage: string;
  orderStatus: "idle" | "pending" | "success" | "error";
  orderType: OrderType;
  price: string;
  qty: string;
  side: Side;
  username: string;
};

export function OrderFormPanel({
  authError,
  authStatus,
  botMessage,
  botRunning,
  displaySymbol,
  leverage,
  onAuthenticate,
  onLeverageChange,
  onPlaceOrder,
  onPriceChange,
  onQtyChange,
  onSetBestAsk,
  onSetBestBid,
  onSideChange,
  onToggleBot,
  onTypeChange,
  orderMessage,
  orderStatus,
  orderType,
  price,
  qty,
  side,
  username,
}: OrderFormPanelProps) {
  const [accountUsername, setAccountUsername] = useState("");
  const [accountPassword, setAccountPassword] = useState("");
  const isReady = authStatus === "ready";

  return (
    <aside className="card order-form-panel" aria-labelledby="order-heading">
      <div className="card-head">
        <b id="order-heading">Order</b>
        <small className="right">{displaySymbol}</small>
      </div>

      <form className="order-form" onSubmit={onPlaceOrder}>
        {!isReady && (
          <fieldset className="account-fields">
            <legend>Sign in to trade</legend>
            <div className="account-inputs">
              <label>
                Username
                <input autoComplete="username" value={accountUsername} onChange={(event) => setAccountUsername(event.target.value)} />
              </label>
              <label>
                Password
                <input autoComplete="current-password" type="password" value={accountPassword} onChange={(event) => setAccountPassword(event.target.value)} />
              </label>
            </div>
            <div className="account-actions">
              <button type="button" disabled={authStatus === "pending"} onClick={() => onAuthenticate("signin", accountUsername, accountPassword)}>Sign in</button>
              <button type="button" disabled={authStatus === "pending"} onClick={() => onAuthenticate("signup", accountUsername, accountPassword)}>Create account</button>
            </div>
            {authStatus === "pending" && <p>Signing in…</p>}
            {authStatus === "error" && <p className="error-message">{authError}</p>}
          </fieldset>
        )}

        <div className="side-toggle" aria-label="Trade side">
          <button className={side === "long" ? "selected long" : ""} type="button" onClick={() => onSideChange("long")}>Long</button>
          <button className={side === "short" ? "selected short" : ""} type="button" onClick={() => onSideChange("short")}>Short</button>
        </div>

        <div className="order-type-row">
          <span>Order type</span>
          <div className="order-type-toggle">
            <button className={orderType === "limit" ? "selected" : ""} type="button" onClick={() => onTypeChange("limit")}>Limit</button>
            <button className={orderType === "market" ? "selected" : ""} type="button" onClick={() => onTypeChange("market")}>Market</button>
          </div>
        </div>

        {orderType === "limit" ? (
          <label className="field">
            <small>Price</small>
            <input inputMode="decimal" value={price} onChange={(event) => onPriceChange(event.target.value)} />
            <span className="field-suffix">USD</span>
            <span className="price-actions">
              <button type="button" onClick={onSetBestBid}>Best bid</button>
              <button type="button" onClick={onSetBestAsk}>Best ask</button>
            </span>
          </label>
        ) : (
          <div className="field market-field"><small>Price</small><b>Market execution</b></div>
        )}

        <label className="field">
          <small>Quantity</small>
          <input inputMode="decimal" value={qty} onChange={(event) => onQtyChange(event.target.value)} />
          <span className="field-suffix">BTC</span>
        </label>

        <label className="field">
          <small>Leverage</small>
          <input inputMode="decimal" value={leverage} onChange={(event) => onLeverageChange(event.target.value)} />
          <span className="field-suffix">×</span>
        </label>

        <button className={`place-button ${side}`} type="submit" disabled={!isReady || orderStatus === "pending"}>
          {orderStatus === "pending" ? "Placing order…" : `Place ${side === "long" ? "Long" : "Short"}`}
        </button>

        {isReady && <p className="session-status">Signed in as {username}</p>}
        {orderStatus !== "idle" && <p className={`execution-feedback ${orderStatus}`} role="status">{orderMessage}</p>}

        <div className="bot-controls">
          <div className="bot-heading"><b>Liquidity Bot</b><span className={botRunning ? "running" : ""}>{botRunning ? "RUNNING" : "STOPPED"}</span></div>
          <div className="bot-buttons">
            <button className={botRunning ? "active" : ""} type="button" onClick={() => onToggleBot(true)}>Start Bot</button>
            <button className={!botRunning ? "active" : ""} type="button" onClick={() => onToggleBot(false)}>Stop Bot</button>
          </div>
          {botMessage && <p className="bot-message" role="status">{botMessage}</p>}
        </div>
      </form>
    </aside>
  );
}
