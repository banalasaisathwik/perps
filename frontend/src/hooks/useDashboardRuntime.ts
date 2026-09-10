import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { seedAsks, seedBids, SYMBOL } from "../data/orderBookSeed";
import type {
  ArchitectureActivity,
  ArchitectureNode,
  ConnectionStatus,
  Level,
  OrderType,
  RecentOrder,
  Side,
} from "../types/dashboard";
import { addTotals, getMidPrice, getSpread } from "../utils/orderBook";

type AuthenticationStatus = "idle" | "pending" | "ready" | "error";
type SubmissionStatus = "idle" | "pending" | "success" | "error";

type DepthPayload = {
  asks?: Level[];
  bids?: Level[];
};

type OrderResponse = {
  filledQty?: number;
  fills?: Array<{ price?: number }>;
  side?: Side;
  status?: string;
};

type WebSocketMessage = DepthPayload & {
  data?: DepthPayload;
  price?: number;
  type?: string;
};

const IDLE_ACTIVITY: ArchitectureActivity = { kind: "idle", node: null };
const STEP_DELAY_MS = 230;

export function useDashboardRuntime() {
  // VITE_API_URL remains the single browser-to-backend boundary. The local
  // fallback is useful when the frontend is started without the dev runner.
  const API_BASE = (import.meta.env.VITE_API_URL as string) ?? "http://localhost:3000";
  const [bids, setBids] = useState<Level[]>(seedBids);
  const [asks, setAsks] = useState<Level[]>(seedAsks);
  const [backendStatus, setBackendStatus] = useState<ConnectionStatus>("checking");
  const [wsStatus, setWsStatus] = useState("disconnected");
  const [botRunning, setBotRunning] = useState(false);
  const [botMessage, setBotMessage] = useState("");
  const [orderType, setOrderType] = useState<OrderType>("limit");
  const [side, setSide] = useState<Side>("long");
  const [price, setPrice] = useState(String(seedBids[0].price));
  const [qty, setQty] = useState("0.250");
  const [leverage, setLeverage] = useState("10");
  const [token, setToken] = useState(() => localStorage.getItem("perps_token") ?? "");
  const [username, setUsername] = useState(() => localStorage.getItem("perps_username") ?? "");
  const [authStatus, setAuthStatus] = useState<AuthenticationStatus>(() =>
    localStorage.getItem("perps_token") && localStorage.getItem("perps_username") ? "ready" : "idle",
  );
  const [authError, setAuthError] = useState("");
  const [orderStatus, setOrderStatus] = useState<SubmissionStatus>("idle");
  const [orderMessage, setOrderMessage] = useState("");
  const [architectureActivity, setArchitectureActivity] = useState<ArchitectureActivity>(IDLE_ACTIVITY);
  const [recentOrder, setRecentOrder] = useState<RecentOrder | null>(null);
  const [markPrice, setMarkPrice] = useState<number | null>(null);
  const animationIdRef = useRef(0);

  // Bids are shown best-first. Asks are shown highest-first like the approved
  // reference, but totals are still calculated from the best ask outward.
  const bidTotals = useMemo(() => addTotals(bids.slice(0, 11)), [bids]);
  const askTotals = useMemo(() => addTotals(asks.slice(0, 11)).reverse(), [asks]);
  const midPrice = getMidPrice(bids, asks);
  const spread = getSpread(bids, asks);

  async function animateArchitecture(
    kind: ArchitectureActivity["kind"],
    nodes: ArchitectureNode[],
  ) {
    const animationId = animationIdRef.current + 1;
    animationIdRef.current = animationId;

    for (const node of nodes) {
      if (animationId !== animationIdRef.current) {
        return;
      }
      setArchitectureActivity({ kind, node });
      await new Promise<void>((resolve) => window.setTimeout(resolve, STEP_DELAY_MS));
    }

    if (animationId === animationIdRef.current) {
      setArchitectureActivity(IDLE_ACTIVITY);
    }
  }

  function cancelArchitectureAnimation() {
    animationIdRef.current += 1;
    setArchitectureActivity(IDLE_ACTIVITY);
  }

  async function authenticate(
    action: "signin" | "signup",
    submittedUsername: string,
    submittedPassword: string,
  ) {
    const cleanUsername = submittedUsername.trim();
    if (!cleanUsername || !submittedPassword) {
      setAuthError("Enter both a username and password.");
      setAuthStatus("error");
      return;
    }

    setAuthError("");
    setAuthStatus("pending");
    try {
      const response = await fetch(`${API_BASE}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: cleanUsername, password: submittedPassword }),
      });
      const data = (await response.json().catch(() => null)) as
        | { error?: string; token?: string; username?: string }
        | null;

      if (!response.ok) {
        throw new Error(data?.error ?? `HTTP ${response.status}`);
      }
      if (!data?.token || !data.username) {
        throw new Error("The server did not return a session token.");
      }

      localStorage.setItem("perps_token", data.token);
      localStorage.setItem("perps_username", data.username);
      setToken(data.token);
      setUsername(data.username);
      setAuthStatus("ready");
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Unable to reach the server.");
      setAuthStatus("error");
    }
  }

  useEffect(() => {
    void fetch(`${API_BASE}/health`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.json();
      })
      .then(() => setBackendStatus("connected"))
      .catch(() => setBackendStatus("offline"));
  }, [API_BASE]);

  useEffect(() => {
    void fetch(`${API_BASE}/depth/${SYMBOL}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.json() as Promise<DepthPayload>;
      })
      .then((data) => {
        if (Array.isArray(data.bids)) {
          setBids(data.bids);
        }
        if (Array.isArray(data.asks)) {
          setAsks(data.asks);
        }
      })
      // Seed data is intentionally retained as an offline visual fallback.
      .catch(() => undefined);

    const apiUrl = new URL(API_BASE);
    const wsProtocol = apiUrl.protocol === "https:" ? "wss" : "ws";
    const ws = new WebSocket(`${wsProtocol}://${apiUrl.host}/ws`);

    ws.onopen = () => {
      setWsStatus("connected");
      ws.send(JSON.stringify({ op: "subscribe", symbol: SYMBOL }));
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as WebSocketMessage;
        if (message.type === "orderbook.snapshot" || message.type === "orderbook.update") {
          const payload: DepthPayload = message.data ?? message;
          if (Array.isArray(payload.bids)) {
            setBids(payload.bids);
          }
          if (Array.isArray(payload.asks)) {
            setAsks(payload.asks);
          }
          // This route is only started after a real subscribed WebSocket event.
          void animateArchitecture("book-update", ["engine", "redis", "backend", "client"]);
        } else if (message.type === "mark_price.update" && typeof message.price === "number") {
          setMarkPrice(message.price);
          void animateArchitecture("mark-price", ["binance", "mark-price", "redis", "engine"]);
        }
      } catch {
        // Ignore unrelated or malformed messages without taking down the socket.
      }
    };

    ws.onclose = () => setWsStatus("closed");
    ws.onerror = () => setWsStatus("offline");

    return () => {
      try {
        ws.send(JSON.stringify({ op: "unsubscribe", symbol: SYMBOL }));
        ws.close();
      } catch {
        // The browser may already have closed the connection during teardown.
      }
      cancelArchitectureAnimation();
    };
  }, [API_BASE]);

  useEffect(() => {
    void fetch(`${API_BASE}/bot/status`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.json() as Promise<{ running?: boolean }>;
      })
      .then((status) => setBotRunning(status.running === true))
      .catch(() => setBotMessage("Bot controls are unavailable while the backend is offline."));
  }, [API_BASE]);

  async function placeOrder(event: FormEvent) {
    event.preventDefault();
    if (authStatus !== "ready" || orderStatus === "pending") {
      return;
    }

    const numericQty = Number(qty);
    const numericLeverage = Number(leverage);
    const numericPrice = Number(price);
    const body = orderType === "market"
      ? { type: "market" as const, side, symbol: SYMBOL, qty: numericQty, leverage: numericLeverage }
      : { type: "limit" as const, side, symbol: SYMBOL, price: numericPrice, qty: numericQty, leverage: numericLeverage };

    setOrderStatus("pending");
    setOrderMessage("Sending order to the trade engine…");
    // A request animation starts from the only fact known at submit time: the
    // React client initiated an HTTP order request.
    const requestAnimation = animateArchitecture("manual-request", ["client", "backend", "redis", "engine"]);

    try {
      const response = await fetch(`${API_BASE}/create-order`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });
      const result = (await response.json().catch(() => null)) as (OrderResponse & { error?: string }) | null;
      if (!response.ok) {
        throw new Error(result?.error ?? `HTTP ${response.status}`);
      }

      await requestAnimation;
      // The engine result has reached the browser through the actual HTTP
      // response, so the return route is now safe to display.
      await animateArchitecture("manual-response", ["engine", "redis", "backend", "client"]);

      const status = result?.status === "open" || result?.status === "partially_filled" || result?.status === "filled" || result?.status === "cancelled"
        ? result.status
        : "cancelled";
      const fillPrices = (result?.fills ?? [])
        .map((fill) => fill.price)
        .filter((fillPrice): fillPrice is number => typeof fillPrice === "number");
      const filledQty = typeof result?.filledQty === "number" ? result.filledQty : 0;

      setRecentOrder({
        side: result?.side === "short" ? "short" : "long",
        type: orderType,
        status,
        requestedPrice: orderType === "limit" ? numericPrice : null,
        qty: numericQty,
        filledQty,
        fillPrices,
      });
      setOrderStatus("success");
      setOrderMessage(status === "open" ? "Order accepted and waiting in the book." : "Order accepted by the matching engine.");
    } catch (error) {
      await requestAnimation;
      cancelArchitectureAnimation();
      setOrderStatus("error");
      setOrderMessage(error instanceof Error ? error.message : "Unable to place the order.");
    }
  }

  async function toggleBot(start: boolean) {
    setBotMessage(start ? "Starting liquidity bot…" : "Stopping liquidity bot…");
    try {
      const response = await fetch(`${API_BASE}/bot/${start ? "start" : "stop"}`, { method: "POST" });
      const result = (await response.json().catch(() => null)) as {
        error?: string;
        reason?: string;
        started?: boolean;
        stopped?: boolean;
      } | null;
      const running = start
        ? result?.started === true || result?.reason === "already_running"
        : !(result?.stopped === true || result?.reason === "not_running");
      if (!response.ok || (start && !running) || (!start && running)) {
        throw new Error(result?.error ?? `HTTP ${response.status}`);
      }
      setBotRunning(running);
      setBotMessage(running ? "Liquidity bot running." : "Liquidity bot stopped.");
    } catch (error) {
      setBotMessage(error instanceof Error ? error.message : "Unable to update bot state.");
    }
  }

  function setBestAsk() {
    setPrice(String(asks[0]?.price ?? seedAsks[0].price));
  }

  function setBestBid() {
    setPrice(String(bids[0]?.price ?? seedBids[0].price));
  }

  return {
    architectureActivity,
    askTotals,
    authError,
    authenticate,
    authStatus,
    backendStatus,
    bidTotals,
    botMessage,
    botRunning,
    leverage,
    markPrice,
    midPrice,
    orderMessage,
    orderStatus,
    orderType,
    placeOrder,
    price,
    qty,
    recentOrder,
    setBestAsk,
    setBestBid,
    setLeverage,
    setOrderType,
    setPrice,
    setQty,
    setSide,
    side,
    spread,
    toggleBot,
    username,
    wsStatus,
  };
}
