import { sendToEngine } from "../redis/engine-client";

const SYMBOL = process.env.ORDER_BOT_SYMBOL ?? "USD_BTC";

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

let botInterval: NodeJS.Timeout | null = null;

export function startDummyOrderBot() {
  if (botInterval) return { started: false, reason: "already_running" };

  console.log("Starting dummy order bot for", SYMBOL);

  botInterval = setInterval(async () => {
    try {
      const side = Math.random() > 0.5 ? "long" : "short";
      const qty = Number((Math.random() * 0.1 + 0.01).toFixed(4));
      const price = Number((randInt(10000, 11000) + Math.random()).toFixed(2));

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
      // ignore
    }
  }, Number(process.env.ORDER_BOT_INTERVAL_MS ?? 2000));

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
