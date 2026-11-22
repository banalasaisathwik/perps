# Perps Monorepo

Run the full local trading path (matching engine, backend, Binance mark-price service, and frontend):

```bash
# from the repository root
bun run dev
```

Notes:

- The runner loads `.env` from `backend/`, `engine/`, `binance-events-backend/`, and `frontend/`, then passes the values to child processes. A `REDIS_URL` set by `backend/.env` takes precedence, so every service must reach that same Redis instance.
- Backend listens on `PORT` (default 3000). The runner assigns the frontend's `VITE_API_URL` to that port.
- Set `START_ORDER_BOT=true` in `backend/.env` or the shell to start the liquidity bot automatically.
- Redis Streams are transport, not durable storage. Every publisher keeps the
  latest `REDIS_STREAM_MAX_LENGTH` entries (default `1000`) so transient market
  and order-book events cannot exhaust Redis memory.

Render runtime variables:

- Required: `REDIS_URL`, `DATABASE_URL`, `JWT_SECRET`.
- Recommended: `CORS_ORIGIN`.
- Optional: `START_ORDER_BOT`, `DEMO_STARTING_BALANCE`, `ENGINE_TIMEOUT_MS`,
  `ORDER_BOT_INTERVAL_MS`, `ORDER_BOT_REFERENCE_PRICE`, `ORDER_BOT_SYMBOL`,
  `REDIS_CONNECT_TIMEOUT_MS`, `REDIS_STARTUP_TIMEOUT_MS`,
  `REDIS_STREAM_MAX_LENGTH`, `REDIS_STREAM_ENGINE_COMMANDS`,
  `REDIS_STREAM_ENGINE_RESPONSES`, `REDIS_STREAM_ORDERBOOK`, and
  `REDIS_STREAM_MARK_PRICE`.
- Render supplies `PORT`; do not hard-code it. Configure the service health
  check path as `/health`.

Frontend-backed API endpoints:

- `GET /depth/:symbol` — public order-book snapshot.
- `POST /create-order` — authenticated order entry.
- `GET /balances` — authenticated paper balance and current positions.
- `GET /open-orders?symbol=BTCUSDT` — authenticated resting orders.
- `DELETE /order/:orderId` — authenticated cancellation.

Trading state (orders, fills, balances, positions, and books) lives in the engine process. Redis Streams transports commands and events; it is not the durable trading-state store.
