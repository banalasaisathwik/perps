# Runs backend + engine + binance-events-backend as a single Render web
# service. frontend/ is deployed separately to Vercel and is not part of
# this image.
FROM oven/bun:1

WORKDIR /app

COPY package.json bun.lock* ./
COPY backend/package.json backend/bun.lock* ./backend/
COPY engine/package.json engine/bun.lock* ./engine/
COPY binance-events-backend/package.json binance-events-backend/bun.lock* ./binance-events-backend/

RUN bun install --frozen-lockfile \
    && cd backend && bun install --frozen-lockfile \
    && cd ../engine && bun install --frozen-lockfile \
    && cd ../binance-events-backend && bun install --frozen-lockfile

COPY backend ./backend
COPY engine ./engine
COPY binance-events-backend ./binance-events-backend

RUN cd backend && bunx prisma generate

ENV NODE_ENV=production

# Render assigns PORT dynamically; backend/src/index.ts reads it from env.
CMD ["bun", "run", "start"]
