import { useState, type FormEvent } from "react";
import { SYMBOL } from "../data/orderBookSeed";
import type { Balance, OrderType, Position, Side } from "../types/dashboard";
import { effectiveLeverage, formatLeverage } from "../utils/leverage";
import { parseNumericInput } from "../utils/parseNumericInput";

type OrderFormPanelProps = {
  authError: string;
  authStatus: "idle" | "pending" | "ready" | "error";
  balance: Balance | null;
  botMessage: string;
  botRunning: boolean;
  displaySymbol: string;
  leverage: string;
  markPrice: number | null;
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
  positions: Position[];
  price: string;
  qty: string;
  side: Side;
  username: string;
};

function money(value: number | null) {
  return value === null ? "--" : value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function clampLeverage(value: string): string | null {
  const parsed = Number(value);
  if (value.trim() === "" || !Number.isFinite(parsed)) return null;
  return String(Math.min(100, Math.max(1, Math.trunc(parsed))));
}

export function OrderFormPanel(props: OrderFormPanelProps) {
  const [accountUsername, setAccountUsername] = useState("");
  const [accountPassword, setAccountPassword] = useState("");
  const ready = props.authStatus === "ready";

  const numericQty = parseNumericInput(props.qty);
  const numericLeverage = parseNumericInput(props.leverage);
  const numericPrice = props.price.trim() === "" ? null : parseNumericInput(props.price);
  const referencePrice = props.orderType === "market" ? props.markPrice : numericPrice;
  const hasReferencePrice = referencePrice !== null && Number.isFinite(referencePrice) && referencePrice > 0;
  const requiredMargin = hasReferencePrice && Number.isFinite(numericQty) && numericQty > 0 && Number.isFinite(numericLeverage) && numericLeverage > 0 ? (numericQty * (referencePrice as number)) / numericLeverage : null;
  const insufficientMargin = requiredMargin !== null && props.balance !== null && requiredMargin > props.balance.available;

  const mergingPosition = props.positions.find((position) => position.symbol === SYMBOL && position.side === props.side);
  const currentLeverage = mergingPosition ? effectiveLeverage(mergingPosition) : null;
  let projectedLeverage: number | null = null;
  if (mergingPosition && currentLeverage !== null && referencePrice !== null && hasReferencePrice && Number.isFinite(numericQty) && numericQty > 0 && Number.isFinite(numericLeverage) && numericLeverage > 0) {
    const notionalAfter = mergingPosition.averagePrice * mergingPosition.qty + referencePrice * numericQty;
    const marginAfter = mergingPosition.margin + (numericQty * referencePrice) / numericLeverage;
    if (marginAfter > 0) projectedLeverage = notionalAfter / marginAfter;
  }

  function handleLeverageChange(value: string) {
    const clamped = clampLeverage(value);
    if (clamped !== null) props.onLeverageChange(clamped);
  }

  return <aside className="card order-form-panel" aria-labelledby="order-heading">
    <div className="card-head"><b id="order-heading">New Order</b><small className="right">{props.displaySymbol}</small></div>
    <form className="order-form" onSubmit={props.onPlaceOrder}>
      {!ready && <fieldset className="account-fields"><legend>Sign in to trade</legend><label>Username<input autoComplete="username" value={accountUsername} onChange={(event) => setAccountUsername(event.target.value)} /></label><label>Password<input autoComplete="current-password" type="password" value={accountPassword} onChange={(event) => setAccountPassword(event.target.value)} /></label><div className="account-actions"><button type="button" disabled={props.authStatus === "pending"} onClick={() => props.onAuthenticate("signin", accountUsername, accountPassword)}>Sign in</button><button type="button" disabled={props.authStatus === "pending"} onClick={() => props.onAuthenticate("signup", accountUsername, accountPassword)}>Create account</button></div>{props.authError && <p className="error-message">{props.authError}</p>}</fieldset>}
      <div className="side-toggle"><button className={props.side === "long" ? "selected long" : ""} type="button" onClick={() => props.onSideChange("long")}>Long</button><button className={props.side === "short" ? "selected short" : ""} type="button" onClick={() => props.onSideChange("short")}>Short</button></div>
      <label className="field"><small>ORDER TYPE</small><select value={props.orderType} onChange={(event) => props.onTypeChange(event.target.value as OrderType)}><option value="limit">Limit</option><option value="market">Market</option></select></label>
      {props.orderType === "limit" ? <label className="field"><small>PRICE</small><input inputMode="decimal" value={props.price} onChange={(event) => props.onPriceChange(event.target.value)} /><span>USDT</span></label> : <div className="field"><small>PRICE</small><b>Market execution</b></div>}
      <label className="field"><small>QUANTITY</small><input inputMode="decimal" value={props.qty} onChange={(event) => props.onQtyChange(event.target.value)} /><span>BTC</span></label>
      <label className="field"><small>LEVERAGE</small><input inputMode="decimal" value={props.leverage} onChange={(event) => handleLeverageChange(event.target.value)} /><span>×</span></label>
      <div className="field"><small>COST</small><b>{requiredMargin === null ? "--" : `${money(requiredMargin)} USDT`}</b></div>
      {projectedLeverage !== null && currentLeverage !== null && <p className="caution-message">Merges into your open {props.side} — effective leverage {formatLeverage(currentLeverage)} → {formatLeverage(projectedLeverage)}</p>}
      {insufficientMargin && <p className="margin-warning">Insufficient margin — available {money(props.balance?.available ?? null)}</p>}
      <button className={`place-button ${props.side}`} type="submit" disabled={!ready || props.orderStatus === "pending" || insufficientMargin}>{props.orderStatus === "pending" ? "Placing order…" : `Place ${props.side === "long" ? "Long" : "Short"}`}</button>
      {ready && <p className="session-status">Signed in as {props.username}</p>}
      {props.orderStatus !== "idle" && <p className={`execution-feedback ${props.orderStatus}`} role="status">{props.orderMessage}</p>}
      <div className="bot-controls"><div className="bot-heading"><b>Liquidity Bot</b><span className={props.botRunning ? "running" : ""}>{props.botRunning ? "RUNNING" : "STOPPED"}</span></div><div className="bot-buttons"><button className={props.botRunning ? "active" : ""} type="button" onClick={() => props.onToggleBot(true)}>Start Bot</button><button className={!props.botRunning ? "active" : ""} type="button" onClick={() => props.onToggleBot(false)}>Stop Bot</button></div>{props.botMessage && <p className="bot-message">{props.botMessage}</p>}</div>
    </form>
  </aside>;
}
