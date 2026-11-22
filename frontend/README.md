# PERPS Lab — manual V1 trading UI

Lightweight React/Vite terminal for the original `v1-with queue` engine. No automatic order bot, fake order-book seed, Redis Streams, or background market-maker.

## Local development

Run Redis and PostgreSQL (existing local services or disposable local containers), then configure the backend. Never paste database or JWT credentials in a public issue or commit.

```sh
# backend/.env (example values only; use your own values)
REDIS_URL=redis://127.0.0.1:6379
DATABASE_URL=postgresql://perps:yourpassword@127.0.0.1:5432/perps
JWT_SECRET=replace-with-a-long-random-secret
PORT=3000
```

The matching engine uses the **same** Redis URL and queue name as the backend. Put `REDIS_URL` in `engine/.env` or export it when launching the engine. If you run the Binance mark-price worker, give it the same Redis URL and queue name; it is optional for a basic two-user matching demo.

```sh
cd backend
bun install
bunx prisma generate
bunx prisma migrate deploy
bun src/index.ts
```

From a second terminal:

```sh
cd engine
bun install
bun src/index.ts
```

From a third terminal:

```sh
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. Vite proxies local `/api/*` requests to the backend on port 3000.

### Deployment

For a separately hosted frontend, set `VITE_API_URL` to the full public **backend** origin, without the final slash (e.g. `https://your-api.example.com`). This is a **build-time** Vite environment variable. Do not set it to the Vercel frontend domain.

The old V1 backend uses Redis **lists** (`LPUSH`/`BRPOP`), not the newer Redis Stream names. Set `REDIS_URL`, `DATABASE_URL`, `JWT_SECRET`, and the host-provided `PORT` for backend deployment. Check `GET /health` and run both backend and engine processes. The V1 repo snapshot has **no production Dockerfile**; use a tested service-specific deployment configuration before deploying.

### Manual match test

1. Create an account as Alice.
2. Place a **Sell / Short**, **Limit**, **BTCUSDC**, price **90000**, quantity **0.01**, leverage **5x**.
3. Sign out and create another account as Bob.
4. Place a **Buy / Long**, **Limit** at **90000**, quantity **0.01**, leverage **5x**.
5. Observe Bob's filled order and the resulting positions. Sign in as Alice again to view her original order. There is no bot or synthetic depth.

You can place market orders only when the opposite side of the book has liquidity.

### Important limitations

- This is **paper trading**; no real funds and no exchange-grade risk controls.
- Matching state, balances, positions and orders are **in engine process memory**. All are lost when the engine restarts.
- The UI's **Your orders** list tracks the 15 most recent order IDs in the local browser for each account, then looks them up through the authenticated V1 API. It is not a complete server-side order-history API.
- Quotes are derived from actual resting orders, not a continuous Binance mark price. Without manually entered orders, the order book is empty by design.
- The original queue is destructive on consume and has no restart replay or idempotency protection. Do not use this design for real-money trading.
- Automatic liquidation is intentionally **disabled** in this minimal V1 demo. The historical liquidation path references missing modules and was not verified. You can inspect positions and their computed liquidation prices, but no liquidation is executed when a mark-price event arrives.
