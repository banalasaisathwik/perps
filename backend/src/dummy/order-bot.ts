import { sendToEngine } from "../redis/engine-client";

// Must match the market-data service and frontend's canonical traded symbol.
const SYMBOL = process.env.ORDER_BOT_SYMBOL ?? "BTCUSDT";
const FALLBACK_REFERENCE_PRICE = Number(process.env.ORDER_BOT_REFERENCE_PRICE ?? 67000);

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

let botInterval: NodeJS.Timeout | null = null;
let nextBotSide: "long" | "short" = "long";

export function startDummyOrderBot() {
  if (botInterval) return { started: false, reason: "already_running" };

  console.log("Starting dummy order bot for", SYMBOL);

  const submitQuote = async () => {
    try {
      // Alternating sides keeps both book halves supplied. Quotes are placed
      // outside the current mark so this single demo account never trades
      // against itself.
      const side = nextBotSide;
      nextBotSide = nextBotSide === "long" ? "short" : "long";
      const qty = Number((Math.random() * 0.1 + 0.01).toFixed(4));
      const markResponse = await sendToEngine("get_mark_price", { symbol: SYMBOL });
      const markPrice = markResponse.ok
        && typeof (markResponse.data as { markPrice?: unknown } | undefined)?.markPrice === "number"
        ? (markResponse.data as { markPrice: number }).markPrice
        : FALLBACK_REFERENCE_PRICE;
      const offset = randInt(5, 45) + Math.random();
      const price = Number((side === "long" ? markPrice - offset : markPrice + offset).toFixed(2));

      const msg = {
        userId: "bot",
        type: "limit",
        side,
        symbol: SYMBOL,
        price,
        qty,
        leverage: 1,
      } as const;

      await sendToEngine("create_order", msg as any);
    } catch (err) {
      console.error("dummy order bot quote failed", err);
    }
  };

  void submitQuote();
  botInterval = setInterval(() => void submitQuote(), Number(process.env.ORDER_BOT_INTERVAL_MS ?? 2000));

  return { started: true };
}

export function stopDummyOrderBot() {
  if (!botInterval) return { stopped: false, reason: "not_running" };
  clearInterval(botInterval);
  botInterval = null;
  console.log("Stopped dummy order bot");
  return { stopped: true };
}

export function botStatus() {
  return { running: Boolean(botInterval) };
}

export default { startDummyOrderBot, stopDummyOrderBot, botStatus };
