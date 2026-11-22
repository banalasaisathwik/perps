import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  Activity,
  ArrowDownLeft,
  ArrowDownRight,
  ArrowRightLeft,
  ArrowUpRight,
  CheckCircle2,
  CircleHelp,
  Clock3,
  Layers3,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Wallet,
  X,
  Zap,
} from "lucide-react";

type Side = "long" | "short";
type OrderType = "limit" | "market";
type OrderStatus = "open" | "partially_filled" | "filled" | "cancelled";
type Session = { token: string; userId: string; username: string };
type Level = { price: number; qty: number };
type Depth = { symbol: string; bids: Level[]; asks: Level[] };
type Position = {
  orderId: string;
  symbol: string;
  side: Side;
  qty: number;
  averagePrice: number;
  leverage: number;
  margin: number;
  liquidationPrice: number;
  pnL: number | null;
};
type Account = {
  balance: { available: number; locked: number };
  positions: Position[];
};
type Fill = { fillId: string; qty: number; price: number };
type Order = {
  orderId: string;
  symbol: string;
  side: Side;
  type: OrderType;
  price: number | null;
  qty: number;
  leverage: number;
  filledQty: number;
  status: OrderStatus;
  fills: Fill[];
  createdAt: number;
};
type Notice = { kind: "success" | "error" | "info"; text: string };

const SYMBOL = "BTCUSDC";
const SESSION_KEY = "perps.v1.session";
const API_BASE = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");

function currentSession(): Session | null {
  try {
    const value = sessionStorage.getItem(SESSION_KEY);
    if (!value) return null;
    const session: unknown = JSON.parse(value);
    if (
      session &&
      typeof session === "object" &&
      "token" in session &&
      "userId" in session &&
      "username" in session &&
      typeof session.token === "string" &&
      typeof session.userId === "string" &&
      typeof session.username === "string"
    ) {
      return session as Session;
    }
  } catch {
    // Invalid or unavailable storage is treated as a signed-out session.
  }
  return null;
}

function orderStorageKey(userId: string): string {
  return `perps.v1.orders.${userId}`;
}

function storedOrderIds(userId: string): string[] {
  try {
    const raw = localStorage.getItem(orderStorageKey(userId));
    const value: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(value)
      ? value.filter((id): id is string => typeof id === "string").slice(0, 15)
      : [];
  } catch {
    return [];
  }
}

function rememberOrder(userId: string, orderId: string) {
  try {
    const ids = [orderId, ...storedOrderIds(userId).filter((id) => id !== orderId)].slice(0, 15);
    localStorage.setItem(orderStorageKey(userId), JSON.stringify(ids));
  } catch {
    // Browser storage may be unavailable; the order result remains visible.
  }
}

async function api<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  const headers: Record<string, string> = {};
  if (init.body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: { ...headers, ...(init.headers as Record<string, string> | undefined) },
    });
  } catch {
    throw new Error("Cannot reach the V1 API. Start the backend on port 3000.");
  }

  const body = await response.text();
  let data: unknown;
  try {
    data = body ? JSON.parse(body) : null;
  } catch {
    data = body;
  }
  if (!response.ok) {
    const error = data && typeof data === "object" && "error" in data
      ? String(data.error)
      : `Request failed (${response.status})`;
    throw new Error(error);
  }
  return data as T;
}

const usd = (value: number, decimals = 2) =>
  new Intl.NumberFormat("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value);
const number = (value: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 5 }).format(value);

function BookRows({
  levels,
  side,
  maxQty,
}: {
  levels: Level[];
  side: "bid" | "ask";
  maxQty: number;
}) {
  if (!levels.length) {
    return <div className="book-empty">No {side === "ask" ? "sell" : "buy"} liquidity yet</div>;
  }
  return (
    <div className="book-rows">
      {levels.map((level, index) => (
        <div className={`book-row ${side}`} key={`${level.price}-${index}`}>
          <span className="depth-bar" style={{ width: `${Math.min(100, (level.qty / maxQty) * 100)}%` }} />
          <span className="book-price">{usd(level.price)}</span>
          <span className="book-qty">{number(level.qty)}</span>
          <span className="book-total">{usd(level.price * level.qty)}</span>
        </div>
      ))}
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState<Session | null>(currentSession);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [authPending, setAuthPending] = useState(false);
  const [depth, setDepth] = useState<Depth | null>(null);
  const [depthError, setDepthError] = useState(false);
  const [account, setAccount] = useState<Account | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [lastOrder, setLastOrder] = useState<Order | null>(null);
  const [side, setSide] = useState<Side>("long");
  const [orderType, setOrderType] = useState<OrderType>("limit");
  const [price, setPrice] = useState("90000");
  const [qty, setQty] = useState("0.01");
  const [leverage, setLeverage] = useState("5");
  const [orderPending, setOrderPending] = useState(false);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  const loadDepth = useCallback(async () => {
    try {
      const result = await api<Depth>(`/depth/${SYMBOL}`);
      setDepth(result);
      setDepthError(false);
    } catch {
      setDepthError(true);
    }
  }, []);

  const loadAccount = useCallback(async () => {
    if (!session) return;
    try {
      setAccount(await api<Account>("/balances", {}, session.token));
    } catch {
      // Keep last known value; next poll may recover.
    }
  }, [session]);

  const loadOrders = useCallback(async () => {
    if (!session) return;
    const ids = storedOrderIds(session.userId);
    if (!ids.length) {
      setOrders([]);
      return;
    }
    const found = await Promise.allSettled(
      ids.map((id) => api<Order>(`/order/${encodeURIComponent(id)}`, {}, session.token)),
    );
    setOrders(
      found
        .filter((entry): entry is PromiseFulfilledResult<Order> => entry.status === "fulfilled")
        .map((entry) => entry.value)
        .sort((a, b) => b.createdAt - a.createdAt),
    );
  }, [session]);

  useEffect(() => {
    void loadDepth();
    const timer = window.setInterval(() => void loadDepth(), 3000);
    return () => window.clearInterval(timer);
  }, [loadDepth]);

  useEffect(() => {
    if (!session) {
      setAccount(null);
      setOrders([]);
      setLastOrder(null);
      return;
    }
    void loadAccount();
    void loadOrders();
    const timer = window.setInterval(() => {
      void loadAccount();
      void loadOrders();
    }, 5000);
    return () => window.clearInterval(timer);
  }, [session, loadAccount, loadOrders]);

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!username.trim() || !password) {
      setNotice({ kind: "error", text: "Enter a username and password." });
      return;
    }
    setAuthPending(true);
    setNotice(null);
    try {
      const result = await api<Session>(authMode === "signin" ? "/signin" : "/signup", {
        method: "POST",
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const next = { token: result.token, userId: result.userId, username: result.username };
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(next));
      setSession(next);
      setPassword("");
      setNotice({ kind: "success", text: `Signed in as ${next.username}. You can now place manual orders.` });
    } catch (error) {
      setNotice({ kind: "error", text: (error as Error).message });
    } finally {
      setAuthPending(false);
    }
  }

  function logout() {
    sessionStorage.removeItem(SESSION_KEY);
    setSession(null);
    setNotice({ kind: "info", text: "Signed out. Sign in as another user to match the resting order." });
  }

  async function handleOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;
    const quantity = Number(qty);
    const multiplier = Number(leverage);
    const limitPrice = Number(price);
    if (!(quantity > 0) || !(multiplier > 0) || (orderType === "limit" && !(limitPrice > 0))) {
      setNotice({ kind: "error", text: "Enter a positive quantity, leverage, and limit price." });
      return;
    }
    setOrderPending(true);
    setNotice(null);
    try {
      const placed = await api<Order>("/create-order", {
        method: "POST",
        body: JSON.stringify({
          symbol: SYMBOL,
          side,
          type: orderType,
          price: orderType === "limit" ? limitPrice : null,
          qty: quantity,
          leverage: multiplier,
        }),
      }, session.token);
      rememberOrder(session.userId, placed.orderId);
      setLastOrder(placed);
      setNotice({
        kind: "success",
        text: placed.status === "filled"
          ? "Order matched and filled."
          : placed.status === "cancelled"
            ? "Order returned as cancelled. Market orders require opposite-side liquidity."
            : `Order accepted with status ${placed.status.replace("_", " ")}.`,
      });
      await Promise.all([loadDepth(), loadOrders(), loadAccount()]);
    } catch (error) {
      setNotice({ kind: "error", text: (error as Error).message });
    } finally {
      setOrderPending(false);
    }
  }

  async function cancelOrder(orderId: string) {
    if (!session) return;
    setCancelling(orderId);
    try {
      await api<Order>(`/order/${encodeURIComponent(orderId)}`, { method: "DELETE" }, session.token);
      setNotice({ kind: "success", text: "Cancellation request completed." });
      await Promise.all([loadDepth(), loadOrders(), loadAccount()]);
    } catch (error) {
      setNotice({ kind: "error", text: (error as Error).message });
    } finally {
      setCancelling(null);
    }
  }

  const asks = depth?.asks.slice(0, 7).reverse() ?? [];
  const bids = depth?.bids.slice(0, 7) ?? [];
  const maxQty = Math.max(1, ...asks.map((level) => level.qty), ...bids.map((level) => level.qty));
  const bestAsk = depth?.asks[0]?.price;
  const bestBid = depth?.bids[0]?.price;
  const spread = bestAsk !== undefined && bestBid !== undefined ? bestAsk - bestBid : null;
  const qtyNumber = Number(qty);
  const priceNumber = Number(price);
  const leverageNumber = Number(leverage);
  const estimatedMargin = orderType === "limit" && priceNumber > 0 && qtyNumber > 0 && leverageNumber > 0
    ? (priceNumber * qtyNumber) / leverageNumber : null;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark"><Layers3 size={22} strokeWidth={2.4} /></div>
          <span className="brand-name">perps<span className="brand-dot">.</span></span>
          <span className="brand-divider" />
          <span className="brand-suffix">LAB / V1</span>
        </div>
        <div className="topbar-right">
          <span className="top-tag"><span className="tag-dot" /> PAPER TRADING</span>
          <span className="top-tag muted">NO AUTO BOT</span>
          {session ? (
            <div className="top-user">
              <span className="avatar">{session.username.charAt(0).toUpperCase()}</span>
              <span className="top-username">{session.username}</span>
              <button className="logout-btn" onClick={logout} title="Switch account"><LogOut size={16} /></button>
            </div>
          ) : <span className="visitor-label">Guest session</span>}
        </div>
      </header>

      <div className="page-layout">
        <aside className="sidebar">
          <div className="sidebar-label">WORKSPACE</div>
          <div className="nav-item active"><Activity size={17} /> Trading terminal <span className="nav-indicator" /></div>
          <div className="nav-item subtle"><ArrowRightLeft size={17} /> Matching engine</div>
          <div className="sidebar-divider" />
          <div className="sidebar-label">ENVIRONMENT</div>
          <div className="system-stat"><span>Execution</span><strong>Manual</strong></div>
          <div className="system-stat"><span>Matching</span><strong>In-memory</strong></div>
          <div className="system-stat"><span>Transport</span><strong>Redis list</strong></div>
          <div className="sidebar-bottom">
            <div className="sidebar-info-icon"><ShieldCheck size={20} /></div>
            <strong>Back to the basics.</strong>
            <p>The original matching engine. No bots, no fake depth, just real orders from real test accounts.</p>
            <span className="sidebar-version">BUILD / MAY 2026</span>
          </div>
        </aside>

        <main className="main">
          <div className="heading-row">
            <div>
              <div className="eyebrow">TRADING TERMINAL <span>/</span> SPOTLIGHT</div>
              <div className="market-title">
                <span className="coin-mark">₿</span>
                <div><h1>BTC <span>/ USDC</span></h1><p>Manual perpetuals matching sandbox</p></div>
              </div>
            </div>
            <div className={`connection-pill ${depthError ? "offline" : depth ? "online" : "loading"}`}>
              <span className="connection-dot" />
              {depthError ? "API UNREACHABLE" : depth ? "ENGINE RESPONDING" : "CONNECTING"}
              <button className="refresh-button" onClick={() => void loadDepth()} aria-label="Refresh order book"><RefreshCw size={15} /></button>
            </div>
          </div>

          {notice && (
            <div className={`notice notice-${notice.kind}`} role="status">
              {notice.kind === "success" ? <CheckCircle2 size={17} /> : <CircleHelp size={17} />}
              <span>{notice.text}</span>
              <button onClick={() => setNotice(null)} aria-label="Dismiss notification"><X size={16} /></button>
            </div>
          )}

          <section className="metrics">
            <div className="metric"><span>BEST BID</span><strong className="green-text">{bestBid === undefined ? "—" : usd(bestBid)}</strong><small>USDC</small></div>
            <div className="metric"><span>BEST ASK</span><strong className="red-text">{bestAsk === undefined ? "—" : usd(bestAsk)}</strong><small>USDC</small></div>
            <div className="metric"><span>SPREAD</span><strong>{spread === null ? "—" : usd(spread)}</strong><small>USDC</small></div>
            <div className="metric"><span>YOUR AVAILABLE</span><strong>{account ? `$${usd(account.balance.available)}` : "—"}</strong><small>{session ? "PAPER USD" : "SIGN IN TO VIEW"}</small></div>
          </section>

          <div className="workspace-grid">
            <div className="main-column">
              <section className="panel book-panel">
                <div className="panel-heading">
                  <div><h2>Order book</h2><p>Live manual liquidity · refreshed every 3s</p></div>
                  <div className="heading-end"><span className="small-dot" /> {SYMBOL}</div>
                </div>
                <div className="book-table-header"><span>PRICE (USDC)</span><span>SIZE (BTC)</span><span>TOTAL (USDC)</span></div>
                <div className="book-section">
                  <BookRows levels={asks} side="ask" maxQty={maxQty} />
                </div>
                <div className="book-midline">
                  <div><ArrowDownRight size={16} /><strong>{bestAsk === undefined ? "No asks" : usd(bestAsk)}</strong><span>lowest ask</span></div>
                  <div className="midline-divider" />
                  <div><ArrowUpRight size={16} /><strong>{bestBid === undefined ? "No bids" : usd(bestBid)}</strong><span>highest bid</span></div>
                </div>
                <div className="book-section"><BookRows levels={bids} side="bid" maxQty={maxQty} /></div>
                <div className="book-footer"><Clock3 size={14} /> Real engine data · no simulated orders</div>
              </section>

              <section className="panel orders-panel">
                <div className="panel-heading">
                  <div><h2>Your orders</h2><p>Recent orders placed from this browser account</p></div>
                  <button className="icon-action" onClick={() => void loadOrders()} disabled={!session} aria-label="Refresh orders"><RefreshCw size={16} /></button>
                </div>
                {orders.length ? (
                  <div className="orders-scroll">
                    <table className="orders-table">
                      <thead><tr><th>ORDER</th><th>PRICE</th><th>FILLED</th><th>STATUS</th><th /></tr></thead>
                      <tbody>{orders.map((order) => (
                        <tr key={order.orderId}>
                          <td><span className={`side-chip ${order.side}`}>{order.side === "long" ? "BUY" : "SELL"}</span><span className="order-type-cell">{order.type}</span></td>
                          <td>{order.price === null ? "Market" : usd(order.price)}</td>
                          <td>{number(order.filledQty)} / {number(order.qty)}</td>
                          <td><span className={`status-chip ${order.status}`}>{order.status.replace("_", " ")}</span></td>
                          <td>{order.type === "limit" && (order.status === "open" || order.status === "partially_filled") ? (
                            <button className="cancel-btn" disabled={cancelling === order.orderId} onClick={() => void cancelOrder(order.orderId)}>
                              {cancelling === order.orderId ? "..." : "Cancel"}
                            </button>
                          ) : null}</td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                ) : <div className="empty-orders"><ArrowRightLeft size={26} /><strong>{session ? "No orders yet" : "Sign in to see orders"}</strong><p>{session ? "Your manually placed orders will appear here." : "Only your own authenticated orders are shown."}</p></div>}
              </section>
            </div>

            <div className="right-column">
              <section className="panel trade-panel">
                <div className="panel-heading">
                  <div><h2>{session ? "Place order" : "Your trading account"}</h2><p>{session ? "Execute against the V1 matching engine" : "Sign in to place manual orders"}</p></div>
                  <span className="panel-badge">{session ? "MANUAL" : "AUTH"}</span>
                </div>
                {session ? (
                  <form onSubmit={handleOrder} className="trade-form">
                    <div className="segmented"><button type="button" className={side === "long" ? "selected buy" : ""} onClick={() => setSide("long")}><ArrowDownLeft size={16} /> Buy / Long</button><button type="button" className={side === "short" ? "selected sell" : ""} onClick={() => setSide("short")}><ArrowUpRight size={16} /> Sell / Short</button></div>
                    <div className="form-label">ORDER TYPE</div>
                    <div className="type-switch"><button type="button" className={orderType === "limit" ? "active" : ""} onClick={() => setOrderType("limit")}>Limit</button><button type="button" className={orderType === "market" ? "active" : ""} onClick={() => setOrderType("market")}>Market</button></div>
                    {orderType === "limit" && <label className="field-label">Limit price <span>USDC</span><div className="input-shell"><input type="number" min="0.00001" step="any" required value={price} onChange={(event) => setPrice(event.target.value)} /><strong>USDC</strong></div></label>}
                    <label className="field-label">Quantity <span>BTC</span><div className="input-shell"><input type="number" min="0.000001" step="any" required value={qty} onChange={(event) => setQty(event.target.value)} /><strong>BTC</strong></div></label>
                    <label className="field-label">Leverage <span>Paper margin</span><div className="input-shell"><select value={leverage} onChange={(event) => setLeverage(event.target.value)}><option value="1">1×</option><option value="2">2×</option><option value="5">5×</option><option value="10">10×</option><option value="20">20×</option></select><strong>LEV</strong></div></label>
                    <div className="order-estimate"><div><span>Estimated margin</span><strong>{estimatedMargin === null ? "At execution" : `$${usd(estimatedMargin)}`}</strong></div><div><span>Order source</span><strong>Manual only</strong></div></div>
                    <button className={`submit-trade ${side}`} type="submit" disabled={orderPending || depthError}>{orderPending ? "Submitting..." : side === "long" ? "Place buy order" : "Place sell order"} <ArrowUpRight size={17} /></button>
                    <p className="trade-disclaimer"><ShieldCheck size={14} /> Paper trading only. Market orders need existing opposite-side liquidity.</p>
                    {lastOrder && <div className="last-result"><span>LAST ORDER RESULT</span><strong>{lastOrder.status.replace("_", " ")} · {number(lastOrder.filledQty)} / {number(lastOrder.qty)} BTC</strong><code>{lastOrder.orderId.slice(0, 18)}…</code></div>}
                  </form>
                ) : (
                  <form className="auth-form" onSubmit={handleAuth}>
                    <div className="auth-switch"><button type="button" className={authMode === "signin" ? "active" : ""} onClick={() => setAuthMode("signin")}>Sign in</button><button type="button" className={authMode === "signup" ? "active" : ""} onClick={() => setAuthMode("signup")}>Create account</button></div>
                    <label className="field-label">Username<div className="input-shell"><input autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="e.g. trader_alice" required /></div></label>
                    <label className="field-label">Password<div className="input-shell"><input autoComplete={authMode === "signup" ? "new-password" : "current-password"} type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter password" required /></div></label>
                    <button className="submit-trade long" disabled={authPending} type="submit">{authPending ? "Connecting..." : authMode === "signin" ? "Sign in to trade" : "Create paper account"} <ArrowUpRight size={17} /></button>
                    <p className="trade-disclaimer"><ShieldCheck size={14} /> Accounts are stored by the V1 API. Use test credentials only.</p>
                  </form>
                )}
              </section>

              <section className="panel balance-panel">
                <div className="panel-heading"><div><h2>Account overview</h2><p>In-memory paper portfolio</p></div><Wallet size={19} className="muted-icon" /></div>
                <div className="balance-summary"><div><span>AVAILABLE</span><strong>{account ? `$${usd(account.balance.available)}` : "—"}</strong></div><div><span>LOCKED</span><strong>{account ? `$${usd(account.balance.locked)}` : "—"}</strong></div></div>
                <div className="position-header">POSITIONS <span>{account?.positions.length ?? 0} OPEN</span></div>
                {account?.positions.length ? account.positions.map((position, index) => <div className="position-line" key={`${position.orderId}-${index}`}><div><strong>{position.symbol}</strong><span className={position.side === "long" ? "green-text" : "red-text"}>{position.side.toUpperCase()} · {position.leverage}×</span></div><div className="position-values"><strong>{number(position.qty)} BTC</strong><small>Entry {usd(position.averagePrice)}</small></div></div>) : <div className="no-positions">No open positions</div>}
              </section>

              <section className="guide-panel">
                <div className="guide-title"><Zap size={17} /><strong>Try a real match</strong></div>
                <p>There is no liquidity bot in this version. Create the two sides yourself:</p>
                <ol><li>Sign up as <strong>Alice</strong>. Place a <strong>Sell / Short</strong> limit order at 90,000 USDC for 0.01 BTC.</li><li>Sign out, then sign up as <strong>Bob</strong>. Place a <strong>Buy / Long</strong> limit order at 90,000 USDC for 0.01 BTC.</li><li>Watch the order book update and check the filled quantity on both accounts.</li></ol>
                <div className="guide-footer"><CircleHelp size={15} /> Engine state resets if the server restarts.</div>
              </section>
            </div>
          </div>

          <footer className="page-footer"><span><Zap size={14} /> PERPS LAB · ORIGINAL V1 MATCHING ENGINE</span><span>No market maker · No auto bot · Not for real funds</span></footer>
        </main>
      </div>
    </div>
  );
}
