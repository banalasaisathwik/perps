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

Frontend-backed API endpoints:

- `GET /depth/:symbol` — public order-book snapshot.
- `POST /create-order` — authenticated order entry.
- `GET /balances` — authenticated paper balance and current positions.
- `GET /open-orders?symbol=BTCUSDT` — authenticated resting orders.
- `DELETE /order/:orderId` — authenticated cancellation.

Trading state (orders, fills, balances, positions, and books) lives in the engine process. Redis Streams transports commands and events; it is not the durable trading-state store.
