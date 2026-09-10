import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { SYMBOL } from "../data/orderBookSeed";
import type { ArchitectureActivity, ArchitectureNode, Level, OpenOrder, OrderType, Position, RecentOrder, Side } from "../types/dashboard";
import { addTotals, getSpread } from "../utils/orderBook";

type AuthenticationStatus = "idle" | "pending" | "ready" | "error";
type SubmissionStatus = "idle" | "pending" | "success" | "error";
type DepthPayload = { asks?: Level[]; bids?: Level[] };
type OrderResponse = { filledQty?: number; fills?: Array<{ price?: number }>; side?: Side; status?: RecentOrder["status"] };
type WebSocketMessage = DepthPayload & { data?: DepthPayload; price?: number; type?: string };
type AccountPayload = { positions?: Position[] };

const API_BASE = (import.meta.env.VITE_API_URL as string) ?? "http://localhost:3000";
const IDLE_ACTIVITY: ArchitectureActivity = { kind: "idle", node: null };
const STEP_DELAY_MS = 230;

function responseError(data: { error?: string } | null, response: Response) {
  return data?.error ?? `HTTP ${response.status}`;
}

export function useDashboardRuntime() {
  const [bids, setBids] = useState<Level[]>([]);
  const [asks, setAsks] = useState<Level[]>([]);
  const [botRunning, setBotRunning] = useState(false);
  const [botMessage, setBotMessage] = useState("");
  const [orderType, setOrderType] = useState<OrderType>("limit");
  const [side, setSide] = useState<Side>("long");
  const [price, setPrice] = useState("");
  const [qty, setQty] = useState("0.250");
  const [leverage, setLeverage] = useState("10");
  const [token, setToken] = useState(() => localStorage.getItem("perps_token") ?? "");
  const [username, setUsername] = useState(() => localStorage.getItem("perps_username") ?? "");
  const [authStatus, setAuthStatus] = useState<AuthenticationStatus>(() => token && username ? "ready" : "idle");
  const [authError, setAuthError] = useState("");
  const [orderStatus, setOrderStatus] = useState<SubmissionStatus>("idle");
  const [orderMessage, setOrderMessage] = useState("");
  const [architectureActivity, setArchitectureActivity] = useState<ArchitectureActivity>(IDLE_ACTIVITY);
  const [recentOrder, setRecentOrder] = useState<RecentOrder | null>(null);
  const [markPrice, setMarkPrice] = useState<number | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [openOrders, setOpenOrders] = useState<OpenOrder[]>([]);
  const animationIdRef = useRef(0);
  const refreshInFlight = useRef(false);

  const bidTotals = useMemo(() => addTotals(bids.slice(0, 12)), [bids]);
  const askTotals = useMemo(() => addTotals(asks.slice(0, 12)).reverse(), [asks]);
  const spread = getSpread(bids, asks);
  const displayedMark = markPrice ?? (bids[0] && asks[0] ? (bids[0].price + asks[0].price) / 2 : null);

  const animateArchitecture = useCallback(async (kind: ArchitectureActivity["kind"], nodes: ArchitectureNode[]) => {
    const animationId = animationIdRef.current + 1;
    animationIdRef.current = animationId;
    for (const node of nodes) {
      if (animationId !== animationIdRef.current) return;
      setArchitectureActivity({ kind, node });
      await new Promise<void>((resolve) => window.setTimeout(resolve, STEP_DELAY_MS));
    }
    if (animationId === animationIdRef.current) setArchitectureActivity(IDLE_ACTIVITY);
  }, []);

  const refreshAccount = useCallback(async () => {
    if (!token || refreshInFlight.current) return;
    refreshInFlight.current = true;
    const headers = { Authorization: `Bearer ${token}` };
    try {
      const [accountResponse, ordersResponse] = await Promise.all([
        fetch(`${API_BASE}/balances`, { headers }),
        fetch(`${API_BASE}/open-orders?symbol=${SYMBOL}`, { headers }),
      ]);
      if (accountResponse.ok) {
        const account = await accountResponse.json() as AccountPayload;
        setPositions(Array.isArray(account.positions) ? account.positions : []);
      }
      if (ordersResponse.ok) {
        const orders = await ordersResponse.json() as OpenOrder[];
        setOpenOrders(Array.isArray(orders) ? orders : []);
      }
    } finally {
      refreshInFlight.current = false;
    }
  }, [token]);

  useEffect(() => { void refreshAccount(); }, [refreshAccount]);

  useEffect(() => {
    void fetch(`${API_BASE}/depth/${SYMBOL}`).then((response) => {
      if (!response.ok) throw new Error("Depth unavailable");
      return response.json() as Promise<DepthPayload>;
    }).then((data) => {
      if (Array.isArray(data.bids)) setBids(data.bids);
      if (Array.isArray(data.asks)) setAsks(data.asks);
    }).catch(() => undefined);

    let closed = false;
    let socket: WebSocket | undefined;
    let reconnectTimer: number | undefined;
    const connect = () => {
      const apiUrl = new URL(API_BASE);
      socket = new WebSocket(`${apiUrl.protocol === "https:" ? "wss" : "ws"}://${apiUrl.host}/ws`);
      socket.onopen = () => socket?.send(JSON.stringify({ op: "subscribe", symbol: SYMBOL }));
      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WebSocketMessage;
          if (message.type === "orderbook.snapshot" || message.type === "orderbook.update") {
            const payload = message.data ?? message;
            if (Array.isArray(payload.bids)) setBids(payload.bids);
            if (Array.isArray(payload.asks)) setAsks(payload.asks);
            void animateArchitecture("book-update", ["engine", "redis", "backend", "client"]);
            void refreshAccount();
          } else if (message.type === "mark_price.update" && typeof message.price === "number") {
            setMarkPrice(message.price);
            void refreshAccount();
          }
        } catch { /* Ignore malformed websocket data. */ }
      };
      socket.onclose = () => {
        if (!closed) reconnectTimer = window.setTimeout(connect, 1500);
      };
    };
    connect();
    return () => {
      closed = true;
      if (reconnectTimer !== undefined) window.clearTimeout(reconnectTimer);
      socket?.close();
      animationIdRef.current += 1;
    };
  }, [animateArchitecture, refreshAccount]);

  useEffect(() => {
    void fetch(`${API_BASE}/bot/status`).then((response) => response.ok ? response.json() as Promise<{ running?: boolean }> : Promise.reject()).then((status) => setBotRunning(status.running === true)).catch(() => setBotMessage("Bot controls are unavailable while the backend is offline."));
  }, []);

  async function authenticate(action: "signin" | "signup", submittedUsername: string, submittedPassword: string) {
    if (!submittedUsername.trim() || !submittedPassword) {
      setAuthError("Enter both a username and password."); setAuthStatus("error"); return;
    }
    setAuthStatus("pending"); setAuthError("");
    try {
      const response = await fetch(`${API_BASE}/${action}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: submittedUsername.trim(), password: submittedPassword }) });
      const data = await response.json().catch(() => null) as { error?: string; token?: string; username?: string } | null;
      if (!response.ok || !data?.token || !data.username) throw new Error(responseError(data, response));
      localStorage.setItem("perps_token", data.token); localStorage.setItem("perps_username", data.username);
      setToken(data.token); setUsername(data.username); setAuthStatus("ready");
    } catch (error) { setAuthError(error instanceof Error ? error.message : "Unable to reach the server."); setAuthStatus("error"); }
  }

  async function submitOrder(body: Record<string, unknown>, submittedType: OrderType, requestedPrice: number | null) {
    setOrderStatus("pending"); setOrderMessage("Sending order to the matching engine…");
    const requestAnimation = animateArchitecture("manual-request", ["client", "backend", "redis", "engine"]);
    try {
      const response = await fetch(`${API_BASE}/create-order`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
      const result = await response.json().catch(() => null) as (OrderResponse & { error?: string }) | null;
      if (!response.ok) throw new Error(responseError(result, response));
      await requestAnimation; await animateArchitecture("manual-response", ["engine", "redis", "backend", "client"]);
      const status = result?.status ?? "cancelled";
      const fillPrices = (result?.fills ?? []).map((fill) => fill.price).filter((value): value is number => typeof value === "number");
      setRecentOrder({ side: result?.side === "short" ? "short" : "long", type: submittedType, status, requestedPrice, qty: Number(body.qty), filledQty: result?.filledQty ?? 0, fillPrices });
      setOrderStatus(status === "cancelled" ? "error" : "success");
      setOrderMessage(status === "open" ? "Order accepted and waiting in the book." : status === "cancelled" ? "No executable liquidity was available." : "Order processed by the matching engine.");
      await refreshAccount();
    } catch (error) { animationIdRef.current += 1; setArchitectureActivity(IDLE_ACTIVITY); setOrderStatus("error"); setOrderMessage(error instanceof Error ? error.message : "Unable to place the order."); }
  }

  async function placeOrder(event: FormEvent) {
    event.preventDefault();
    if (authStatus !== "ready" || orderStatus === "pending") return;
    const numericQty = Number(qty); const numericLeverage = Number(leverage); const numericPrice = Number(price);
    if (!Number.isFinite(numericQty) || numericQty <= 0 || !Number.isFinite(numericLeverage) || numericLeverage <= 0 || (orderType === "limit" && (!Number.isFinite(numericPrice) || numericPrice <= 0))) {
      setOrderStatus("error"); setOrderMessage("Enter positive price, quantity, and leverage values."); return;
    }
    const body = orderType === "market" ? { type: "market", side, symbol: SYMBOL, qty: numericQty, leverage: numericLeverage } : { type: "limit", side, symbol: SYMBOL, price: numericPrice, qty: numericQty, leverage: numericLeverage };
    await submitOrder(body, orderType, orderType === "limit" ? numericPrice : null);
  }

  async function closePosition(position: Position) {
    if (authStatus !== "ready") return;
    await submitOrder({ type: "market", side: position.side === "long" ? "short" : "long", symbol: position.symbol, qty: position.qty, leverage: position.leverage }, "market", null);
  }

  async function cancelOpenOrder(orderId: string) {
    try {
      const response = await fetch(`${API_BASE}/order/${orderId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error(responseError(await response.json().catch(() => null), response));
      setOrderStatus("success"); setOrderMessage("Open order cancelled."); await refreshAccount();
    } catch (error) { setOrderStatus("error"); setOrderMessage(error instanceof Error ? error.message : "Unable to cancel the order."); }
  }

  async function toggleBot(start: boolean) {
    setBotMessage(start ? "Starting liquidity bot…" : "Stopping liquidity bot…");
    try {
      const response = await fetch(`${API_BASE}/bot/${start ? "start" : "stop"}`, { method: "POST" });
      const result = await response.json().catch(() => null) as { error?: string; reason?: string; started?: boolean; stopped?: boolean } | null;
      if (!response.ok) throw new Error(responseError(result, response));
      const running = start ? result?.started === true || result?.reason === "already_running" : false;
      setBotRunning(running); setBotMessage(running ? "Liquidity bot running." : "Liquidity bot stopped.");
    } catch (error) { setBotMessage(error instanceof Error ? error.message : "Unable to update bot state."); }
  }

  return { architectureActivity, askTotals, authError, authenticate, authStatus, bidTotals, botMessage, botRunning, cancelOpenOrder, closePosition, displayedMark, leverage, openOrders, orderMessage, orderStatus, orderType, placeOrder, positions, price, qty, recentOrder, setLeverage, setOrderType, setPrice, setQty, setSide, side, spread, toggleBot, username };
}
