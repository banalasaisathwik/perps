import WebSocket from "ws";
import { pushToRedis } from "./redis";

type PriceMap = Map<string, number>;

class MarkPrice {
  
  private static instance: MarkPrice;
  private latestPrices: PriceMap;
  private socket: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  private constructor() {
    this.latestPrices = new Map();
    this.connect();
  }

  static getInstance() {
    if (!MarkPrice.instance) {
      MarkPrice.instance = new MarkPrice();
    }

    return MarkPrice.instance;
  }

  private connect() {
    this.socket = new WebSocket("wss://fstream.binance.com/market/ws/btcusdt@markPrice");
    this.socket.on("open", () => console.log("Binance mark-price websocket connected"));
    this.socket.on("message", (data) => this.handleMessage(data.toString()));
    this.socket.on("error", (error) => console.error("Binance mark-price websocket error", error.message));
    this.socket.on("close", () => {
      if (this.reconnectTimer) return;
      this.reconnectTimer = setTimeout(() => {
        this.reconnectTimer = null;
        this.connect();
      }, 2000);
    });
  }

  private handleMessage(data: string) {
    let payload: { s?: string; p?: string };
    try {
      payload = JSON.parse(data) as { s?: string; p?: string };
    } catch {
      console.error("Ignoring malformed Binance mark-price payload");
      return;
    }
    const symbol = payload.s;
    const markPrice = Number(payload.p);

    if (!symbol || !Number.isFinite(markPrice) || markPrice <= 0) {
      return;
    }

    this.latestPrices.set(symbol, markPrice);

  }

  getPrice(symbol: string) {
    return this.latestPrices.get(symbol);
  }
}

const obj = MarkPrice.getInstance();

// BTCUSDT is the source of truth for the traded symbol; must match SYMBOL in
// frontend/src/data/orderBookSeed.ts and backend/src/dummy/order-bot.ts.
setInterval(async () => {
  const latestPrice = obj.getPrice("BTCUSDT");
  if (latestPrice === undefined) {
    return;
  }

  await pushToRedis(latestPrice, "BTCUSDT");
}, 5000);
