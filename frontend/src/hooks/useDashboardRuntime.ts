import React, { useEffect, useMemo, useRef, useState } from "react";
import { seedAsks, seedBids, SYMBOL } from "../data/orderBookSeed";
import type {
  ConnectionStatus,
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
  const [price, setPrice] = useState(String(seedAsks[0].price));
  const [qty, setQty] = useState("0.250");
  const [leverage, setLeverage] = useState("10");
  const [token, setToken] = useState("");
  const [activeFlow, setActiveFlow] = useState<Flow>("idle");
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
          // Auth is optional in this demo. If present, backend middleware can
          // identify the user; otherwise create-order falls back to "guest".
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      pushEvent(
        "Engine",
        "Processed create_order",
        "Response returned through perps:engine:responses",
      );
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
    askTotals,
    backendStatus,
    bidTotals,
    botRunning,
    clearTimeline,
    leverage,
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
    wsStatus,
  };
}
