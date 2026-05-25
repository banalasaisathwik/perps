import WebSocket from "ws";
import { pushToRedis } from "./redis";

type PriceMap = Map<string, number>;

class MarkPrice {
  
  private static instance: MarkPrice;
  private latestPrices: PriceMap;
  private socket: WebSocket;

  private constructor() {
    this.latestPrices = new Map();
    this.socket = new WebSocket(
      "wss://fstream.binance.com/market/ws/btcusdc@markPrice",
    );

    this.initialise();
  }

  static getInstance() {
    if (!MarkPrice.instance) {
      MarkPrice.instance = new MarkPrice();
    }

    return MarkPrice.instance;
  }

  private initialise() {
    this.socket.on("open", () => console.log("websocket connected"));
    this.socket.on("message", (data) => this.handleMessage(data.toString()));
  }

  private handleMessage(data: string) {
    const payload = JSON.parse(data);
    const symbol = payload.s;
    const markPrice = Number(payload.p);

    if (!symbol || !markPrice) {
      return;
    }

    this.latestPrices.set(symbol, markPrice);

    console.log(symbol, markPrice);
  }

  getPrice(symbol: string) {
    return this.latestPrices.get(symbol);
  }
}

const obj = MarkPrice.getInstance();

setInterval(async () => {
  const latestPrice = obj.getPrice("BTCUSDC");
  if (latestPrice === undefined) {
    return;
  }

  await pushToRedis(latestPrice, "BTCUSDC");
}, 5000);
