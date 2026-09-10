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

export function OrderFormPanel(props: OrderFormPanelProps) {
  const [accountUsername, setAccountUsername] = useState("");
  const [accountPassword, setAccountPassword] = useState("");
  const ready = props.authStatus === "ready";

  return <aside className="card order-form-panel" aria-labelledby="order-heading">
    <div className="card-head"><b id="order-heading">New Order</b><small className="right">{props.displaySymbol}</small></div>
    <form className="order-form" onSubmit={props.onPlaceOrder}>
      {!ready && <fieldset className="account-fields"><legend>Sign in to trade</legend><label>Username<input autoComplete="username" value={accountUsername} onChange={(event) => setAccountUsername(event.target.value)} /></label><label>Password<input autoComplete="current-password" type="password" value={accountPassword} onChange={(event) => setAccountPassword(event.target.value)} /></label><div className="account-actions"><button type="button" disabled={props.authStatus === "pending"} onClick={() => props.onAuthenticate("signin", accountUsername, accountPassword)}>Sign in</button><button type="button" disabled={props.authStatus === "pending"} onClick={() => props.onAuthenticate("signup", accountUsername, accountPassword)}>Create account</button></div>{props.authError && <p className="error-message">{props.authError}</p>}</fieldset>}
      <div className="side-toggle"><button className={props.side === "long" ? "selected long" : ""} type="button" onClick={() => props.onSideChange("long")}>Long</button><button className={props.side === "short" ? "selected short" : ""} type="button" onClick={() => props.onSideChange("short")}>Short</button></div>
      <label className="field"><small>ORDER TYPE</small><select value={props.orderType} onChange={(event) => props.onTypeChange(event.target.value as OrderType)}><option value="limit">Limit</option><option value="market">Market</option></select></label>
      {props.orderType === "limit" ? <label className="field"><small>PRICE</small><input inputMode="decimal" value={props.price} onChange={(event) => props.onPriceChange(event.target.value)} /><span>USDT</span></label> : <div className="field"><small>PRICE</small><b>Market execution</b></div>}
      <label className="field"><small>QUANTITY</small><input inputMode="decimal" value={props.qty} onChange={(event) => props.onQtyChange(event.target.value)} /><span>BTC</span></label>
      <label className="field"><small>LEVERAGE</small><input inputMode="decimal" value={props.leverage} onChange={(event) => props.onLeverageChange(event.target.value)} /><span>×</span></label>
      <button className={`place-button ${props.side}`} type="submit" disabled={!ready || props.orderStatus === "pending"}>{props.orderStatus === "pending" ? "Placing order…" : `Place ${props.side === "long" ? "Long" : "Short"}`}</button>
      {ready && <p className="session-status">Signed in as {props.username}</p>}
      {props.orderStatus !== "idle" && <p className={`execution-feedback ${props.orderStatus}`} role="status">{props.orderMessage}</p>}
      <div className="bot-controls"><div className="bot-heading"><b>Liquidity Bot</b><span className={props.botRunning ? "running" : ""}>{props.botRunning ? "RUNNING" : "STOPPED"}</span></div><div className="bot-buttons"><button className={props.botRunning ? "active" : ""} type="button" onClick={() => props.onToggleBot(true)}>Start Bot</button><button className={!props.botRunning ? "active" : ""} type="button" onClick={() => props.onToggleBot(false)}>Stop Bot</button></div>{props.botMessage && <p className="bot-message">{props.botMessage}</p>}</div>
    </form>
  </aside>;
}
