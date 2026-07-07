import { createClient } from "redis";
import { WebSocketServer, type WebSocket } from "ws";
import { Server as HttpServer } from "http";
import { sendToEngine } from "../redis/engine-client";

const ORDERBOOK_STREAM = process.env.REDIS_STREAM_ORDERBOOK ?? "perps:events:orderbook";

type ClientSubs = Map<WebSocket, Set<string>>;

export function attachPriceWebSocket(server: HttpServer) {
  const wss = new WebSocketServer({ server, path: "/ws" });

  const client = createClient({ url: process.env.REDIS_URL }).on("error", (e) =>
    console.error("orderbook redis subscriber error", e),
  );

  const clients: ClientSubs = new Map();

  void client.connect();

  wss.on("connection", (ws) => {
    clients.set(ws, new Set());

    ws.on("message", async (raw) => {
      try {
        const msg = JSON.parse(String(raw));

        if (msg.op === "subscribe" && typeof msg.symbol === "string") {
          clients.get(ws)!.add(msg.symbol);

          // fetch current depth from engine for immediate feedback
          try {
            const resp = await sendToEngine("get_depth", { symbol: msg.symbol });
            if (resp.ok) {
              ws.send(JSON.stringify({ type: "orderbook.snapshot", data: resp.data }));
            }
          } catch (err) {
            // ignore
          }
        } else if (msg.op === "unsubscribe" && typeof msg.symbol === "string") {
          clients.get(ws)!.delete(msg.symbol);
        }
      } catch (err) {
        console.error("ws message parse error", err);
      }
    });

    ws.on("close", () => {
      clients.delete(ws);
    });
  });

  // read new messages from the orderbook stream and broadcast
  (async () => {
    let lastId = "$"; // only new messages

    for (;;) {
      try {
        const resp = (await client.xRead(
          [{ key: ORDERBOOK_STREAM, id: lastId }],
          { BLOCK: 2000, COUNT: 10 },
        )) as unknown as Array<{ name: string; messages: Array<{ id: string; message: Record<string, string> }> }>;

        if (!resp || resp.length === 0) continue;

        for (const stream of resp) {
          for (const entry of stream.messages) {
            lastId = entry.id;
            const raw = entry.message.data;
            if (!raw) continue;

            let payload: any;
            try {
              payload = JSON.parse(raw);
            } catch (err) {
              continue;
            }

            if (payload && payload.type === "orderbook.updated" && typeof payload.symbol === "string") {
              // broadcast to clients subscribed to this symbol
              for (const [ws, subs] of clients.entries()) {
                if (ws.readyState !== ws.OPEN) continue;
                if (subs.has(payload.symbol)) {
                  ws.send(JSON.stringify({ type: "orderbook.update", data: payload }));
                }
              }
            }
          }
        }
      } catch (err) {
        console.error("orderbook stream read error", err);
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
  })();
}

export default attachPriceWebSocket;
