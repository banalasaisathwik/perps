import React, { useEffect, useMemo, useRef, useState } from "react";
import { seedAsks, seedBids, SYMBOL } from "../data/orderBookSeed";
import type {
  ConnectionStatus,
  RecentOrder,
  Flow,
  Level,
  OrderType,
  Side,
  TimelineEvent,
} from "../types/dashboard";
import { addTotals, getMidPrice, getSpread } from "../utils/orderBook";
import { nowTime } from "../utils/time";

export function useDashboardRuntime() {
  // Vite exposes browser env vars through import.meta.env. The dev runner sets
  // VITE_API_URL to whichever backend port is free, for example http://localhost:3001.
  const API_BASE =
    (import.meta.env.VITE_API_URL as string) ?? "http://localhost:3000";

  // Seeded data makes the dashboard useful before the backend returns live depth.
  // When REST or WebSocket data arrives, these arrays are replaced.
  const [bids, setBids] = useState<Level[]>(seedBids);
  const [asks, setAsks] = useState<Level[]>(seedAsks);
  const [backendStatus, setBackendStatus] =
    useState<ConnectionStatus>("checking");
  const [wsStatus, setWsStatus] = useState("disconnected");
  const [botRunning, setBotRunning] = useState(false);
  const [orderType, setOrderType] = useState<OrderType>("limit");
  const [side, setSide] = useState<Side>("long");
  const [price, setPrice] = useState(String(seedBids[0].price));
  const [qty, setQty] = useState("0.250");
  const [leverage, setLeverage] = useState("10");
  const [token, setToken] = useState("");
  const [username, setUsername] = useState("");
  const [authStatus, setAuthStatus] = useState<"pending" | "ready" | "error">(
    "pending",
  );
  const [activeFlow, setActiveFlow] = useState<Flow>("idle");
    const [recentOrder, setRecentOrder] = useState<RecentOrder | null>(null);
  const [markPrice, setMarkPrice] = useState<number | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([
    {
      id: 1,
      time: nowTime(),
      source: "System",
      event: "Dashboard booted",
      details: "Seeded BTC order book loaded while live services connect",
    },
  ]);
  // Refs keep mutable values between renders without causing another render.
  // eventIdRef prevents duplicate React keys; flowTimeoutRef lets us cancel an old animation timer.
  const eventIdRef = useRef(2);
  const flowTimeoutRef = useRef<number | null>(null);

  function pushEvent(source: string, event: string, details: string) {
    const nextEvent = {
      id: eventIdRef.current,
      time: nowTime(),
      source,
      event,
      details,
    };
    eventIdRef.current += 1;
    setTimeline((items) => [nextEvent, ...items].slice(0, 12));
  }

  function pulseFlow(flow: Flow) {
    // activeFlow is also a CSS class. App.css uses it to highlight the correct path.
    setActiveFlow(flow);
    if (flowTimeoutRef.current) {
      window.clearTimeout(flowTimeoutRef.current);
    }
    flowTimeoutRef.current = window.setTimeout(() => setActiveFlow("idle"), 2400);
  }

  // useMemo avoids recalculating cumulative totals on unrelated state changes
  // such as typing in the order form.
  const frontendAsks = useMemo(() => [...asks].reverse(), [asks]);
  const askTotals = useMemo(() => addTotals(frontendAsks), [frontendAsks]);
  const bidTotals = useMemo(() => addTotals(bids.slice(0, 11)), [bids]);
  const midPrice = getMidPrice(bids, asks);
  const spread = getSpread(bids, asks);

  useEffect(() => {
    // Order creation now requires auth, so every session needs a token. Reuse
    // one saved from a previous visit, or provision a throwaway guest account.
    const savedToken = localStorage.getItem("perps_token");
    const savedUsername = localStorage.getItem("perps_username");

    if (savedToken && savedUsername) {
      setToken(savedToken);
      setUsername(savedUsername);
      setAuthStatus("ready");
      pushEvent(
        "Frontend",
        "Restored session",
        `Reused saved token for ${savedUsername}`,
      );
      return;
    }

    const guestUsername = `guest_${Math.random().toString(36).slice(2, 10)}`;
    const guestPassword = crypto.randomUUID();

    // Signup writes the new account to Postgres before a token comes back,
    // so the flow animation starts here rather than after the response.
    pulseFlow("signup");
    fetch(`${API_BASE}/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: guestUsername, password: guestPassword }),
    })
      .then((r) => {
        if (!r.ok) {
          throw new Error(`HTTP ${r.status}`);
        }
        return r.json();
      })
      .then((data: { token?: string; username?: string }) => {
        if (!data.token || !data.username) {
          throw new Error("Signup response missing token or username");
        }
        localStorage.setItem("perps_token", data.token);
        localStorage.setItem("perps_username", data.username);
        setToken(data.token);
        setUsername(data.username);
        setAuthStatus("ready");
        pushEvent(
          "Backend REST",
          "POST /signup",
          `Provisioned guest session for ${data.username}`,
        );
      })
      .catch((error) => {
        setAuthStatus("error");
        pushEvent(
          "Backend REST",
          "Guest sign-in failed",
          error instanceof Error ? error.message : "Unknown signup error",
        );
      });
  }, [API_BASE]);

  useEffect(() => {
    // Health check proves that the browser can reach the backend currently
    // injected through VITE_API_URL.
    fetch(`${API_BASE}/health`)
      .then((r) => {
        if (!r.ok) {
          throw new Error(`HTTP ${r.status}`);
        }
        return r.json();
      })
      .then(() => {
        setBackendStatus("connected");
        pushEvent("Backend REST", "GET /health", `Connected to ${API_BASE}`);
      })
      .catch(() => {
        setBackendStatus("offline");
        pushEvent(
          "Backend REST",
          "Health check failed",
          `Could not reach ${API_BASE}`,
        );
      });
  }, [API_BASE]);

  useEffect(() => {
    // Initial snapshot comes over REST. Later changes arrive over WebSocket.
    fetch(`${API_BASE}/depth/${SYMBOL}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.bids) && data.bids.length > 0) {
          setBids(data.bids);
        }
        if (Array.isArray(data.asks) && data.asks.length > 0) {
          setAsks(data.asks);
        }
        pushEvent(
          "Backend REST",
          "GET /depth/:symbol",
          "Initial depth returned from engine via Redis RPC",
        );
      })
      .catch(() => {
        pushEvent(
          "Frontend",
          "Depth fallback active",
          "Using seeded book because REST depth is unavailable",
        );
      });

    // Derive the WebSocket URL from the REST base URL so both always point
    // to the same backend process and port.
    const apiUrl = new URL(API_BASE);
    const wsProtocol = apiUrl.protocol === "https:" ? "wss" : "ws";
    const ws = new WebSocket(`${wsProtocol}://${apiUrl.host}/ws`);

    ws.onopen = () => {
      setWsStatus("connected");
      // The backend stores subscriptions per socket, so it only sends this
      // client order-book updates for SYMBOL.
      ws.send(JSON.stringify({ op: "subscribe", symbol: SYMBOL }));
      pushEvent("Frontend", "Subscribed to /ws", `symbol=${SYMBOL}`);
    };

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (
          msg.type === "orderbook.snapshot" ||
          (msg.type === "orderbook.update" && msg.data)
        ) {
          // snapshot and update messages both carry bids/asks; normalize them
          // into the same payload before updating React state.
          const payload = msg.data ?? msg;
          if (Array.isArray(payload.bids)) {
            setBids(payload.bids);
          }
          if (Array.isArray(payload.asks)) {
            setAsks(payload.asks);
          }
          pulseFlow("ws-update");
          pushEvent(
            "Backend WS",
            "orderbook.update received",
            "Engine snapshot reached frontend through Redis orderbook stream",
          );
        } else if (msg.type === "mark_price.update" && typeof msg.price === "number") {
          setMarkPrice(msg.price);
          pulseFlow("mark-price");
          pushEvent(
            "Backend WS",
            "mark_price.update received",
            `Binance -> Mark Price Poller -> engine -> frontend: ${msg.symbol ?? SYMBOL} @ ${msg.price}`,
          );
        }
      } catch {
        pushEvent(
          "Frontend",
          "Ignored WS payload",
          "Message was not valid JSON for the dashboard",
        );
      }
    };

    ws.onclose = () => {
      setWsStatus("closed");
      pushEvent("Backend WS", "WebSocket closed", "Live order book updates stopped");
    };

    return () => {
      try {
        // Cleanup is important in React dev mode because effects can remount;
        // unsubscribing prevents duplicate sockets and duplicate events.
        ws.send(JSON.stringify({ op: "unsubscribe", symbol: SYMBOL }));
        ws.close();
      } catch {
        // no-op during teardown
      }
      if (flowTimeoutRef.current) {
        window.clearTimeout(flowTimeoutRef.current);
      }
    };
  }, [API_BASE]);

  useEffect(() => {
    fetch(`${API_BASE}/bot/status`)
      .then((r) => r.json())
      .then((status) => setBotRunning(Boolean(status.running)))
      .catch(() => {});
  }, [API_BASE]);

  async function placeOrder(e: React.FormEvent) {
    e.preventDefault();
    // Inputs are kept as strings so users can edit them naturally; convert to
    // numbers only when building the backend request payload.
    const numericQty = Number(qty);
    const numericLeverage = Number(leverage);
    const numericPrice = Number(price);
    const body =
      orderType === "market"
        ? {
            type: "market",
            side,
            symbol: SYMBOL,
            qty: numericQty,
            leverage: numericLeverage,
          }
        : {
            type: "limit",
            side,
            symbol: SYMBOL,
            price: numericPrice,
            qty: numericQty,
            leverage: numericLeverage,
          };

    // These timeline events mirror the real backend architecture:
    // REST request -> Redis command stream -> engine -> Redis response stream.
    pulseFlow("place-order");
    pushEvent(
      "Frontend",
      "POST /create-order",
      `symbol=${SYMBOL} side=${side} type=${orderType} qty=${numericQty}`,
    );
    pushEvent(
      "Backend REST",
      "XADD perps:engine:commands",
      "Command queued for the engine with a correlation id",
    );

    try {
      const response = await fetch(`${API_BASE}/create-order`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Auth is mandatory; a token is auto-provisioned on mount (see the
          // sign-in effect above) before the form is ever enabled for submit.
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const orderResult = (await response.json()) as {
        side?: Side;
        status?: string;
        filledQty?: number;
        fills?: Array<{ price?: number }>;
      };
      const fillPrices = (orderResult.fills ?? [])
        .map((fill) => fill.price)
        .filter((fillPrice): fillPrice is number => typeof fillPrice === "number");

const status =
        orderResult.status === "open" ||
        orderResult.status === "partially_filled" ||
        orderResult.status === "filled" ||
        orderResult.status === "cancelled"
          ? orderResult.status
          : "cancelled";
      const filledQty = typeof orderResult.filledQty === "number" ? orderResult.filledQty : 0;

      setRecentOrder({
        side: orderResult.side === "short" ? "short" : "long",
        type: orderType,
        status,
        requestedPrice: orderType === "limit" ? numericPrice : null,
        qty: numericQty,
        filledQty,
        fillPrices,
      });

      if (status === "filled" || status === "partially_filled") {
        pushEvent(
          "Engine",
          "Order matched",
          `${filledQty} ${SYMBOL} matched. The order book highlights the exact price used.`,
        );
      } else if (status === "open") {
        pushEvent(
          "Engine",
          "Order added to the book",
          "The order is waiting at the highlighted price for a matching trader.",
        );
      } else {
        pushEvent("Engine", "Order cancelled", "No matching price was available.");
      }
    } catch (error) {
      pushEvent(
        "Backend REST",
        "Order request failed",
        error instanceof Error ? error.message : "Unknown order error",
      );
    }
  }

  async function toggleBot(start: boolean) {
    try {
      // Bot generation lives in the backend so generated orders use the same
      // Redis/engine path as a manual order from the form.
      const url = `${API_BASE}/bot/${start ? "start" : "stop"}`;
      await fetch(url, { method: "POST" });
      setBotRunning(start);
      pulseFlow(start ? "place-order" : "idle");
      pushEvent("Bot", start ? "Started order bot" : "Stopped order bot", `symbol=${SYMBOL}`);
    } catch {
      pushEvent("Bot", "Bot control failed", "Backend bot endpoint is unavailable");
    }
  }

  function setBestAsk() {
    // Convenience buttons read from the latest live book, falling back to seed data.
    setPrice(String(asks[0]?.price ?? seedAsks[0].price));
  }

  function setBestBid() {
    setPrice(String(bids[0]?.price ?? seedBids[0].price));
  }

  function clearTimeline() {
    setTimeline([]);
  }

  return {
    activeFlow,
    recentOrder,
    askTotals,
    authStatus,
    backendStatus,
    bidTotals,
    botRunning,
    clearTimeline,
    leverage,
    markPrice,
    midPrice,
    orderType,
    placeOrder,
    price,
    qty,
    setBestAsk,
    setBestBid,
    setLeverage,
    setOrderType,
    setPrice,
    setQty,
    setSide,
    setToken,
    side,
    spread,
    timeline,
    token,
    toggleBot,
    username,
    wsStatus,
  };
}
