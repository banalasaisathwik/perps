#!/usr/bin/env bash
set -euo pipefail

: "${REDIS_URL:?set REDIS_URL}"
: "${DATABASE_URL:?set DATABASE_URL}"
: "${JWT_SECRET:?set JWT_SECRET}"

bun engine/src/index.ts > /tmp/perps-v1-engine.log 2>&1 &
ENGINE_PID=$!

(
  cd backend
  bun src/index.ts
) > /tmp/perps-v1-backend.log 2>&1 &
BACKEND_PID=$!

cleanup() {
  kill "$ENGINE_PID" "$BACKEND_PID" 2>/dev/null || true
  wait "$ENGINE_PID" "$BACKEND_PID" 2>/dev/null || true
  echo "--- engine log ---"
  tail -n 35 /tmp/perps-v1-engine.log || true
  echo "--- backend log ---"
  tail -n 35 /tmp/perps-v1-backend.log || true
}
trap cleanup EXIT

ready=0
for _ in $(seq 1 40); do
  if curl -fsS http://127.0.0.1:3000/health -o /tmp/perps-v1-health.json; then
    ready=1
    break
  fi
  sleep 1
done
if [ "$ready" != 1 ]; then
  echo "V1 backend did not start"
  exit 1
fi
node -e 'if (require("/tmp/perps-v1-health.json").ok !== true) process.exit(1)'

ALICE=$(curl -fsS -H 'Content-Type: application/json' -d '{"username":"alice-smoke","password":"example-ci-password"}' http://127.0.0.1:3000/signup)
BOB=$(curl -fsS -H 'Content-Type: application/json' -d '{"username":"bob-smoke","password":"example-ci-password"}' http://127.0.0.1:3000/signup)
ALICE_TOKEN=$(node -e 'process.stdout.write(JSON.parse(process.argv[1]).token)' "$ALICE")
BOB_TOKEN=$(node -e 'process.stdout.write(JSON.parse(process.argv[1]).token)' "$BOB")

SELL=$(curl -fsS -H "Authorization: Bearer $ALICE_TOKEN" -H 'Content-Type: application/json' -d '{"type":"limit","side":"short","symbol":"BTCUSDC","price":90000,"qty":0.01,"leverage":5}' http://127.0.0.1:3000/create-order)
node -e 'if (JSON.parse(process.argv[1]).status !== "open") process.exit(1)' "$SELL"

DEPTH=$(curl -fsS http://127.0.0.1:3000/depth/BTCUSDC)
node -e 'const v=JSON.parse(process.argv[1]); if(v.asks.length!==1 || v.asks[0].price!==90000) process.exit(1)' "$DEPTH"

BUY=$(curl -fsS -H "Authorization: Bearer $BOB_TOKEN" -H 'Content-Type: application/json' -d '{"type":"limit","side":"long","symbol":"BTCUSDC","price":90000,"qty":0.01,"leverage":5}' http://127.0.0.1:3000/create-order)
node -e 'const v=JSON.parse(process.argv[1]); if(v.status!=="filled" || v.filledQty!==0.01) process.exit(1)' "$BUY"

SELL_ID=$(node -e 'process.stdout.write(JSON.parse(process.argv[1]).orderId)' "$SELL")
SELL_AFTER=$(curl -fsS -H "Authorization: Bearer $ALICE_TOKEN" "http://127.0.0.1:3000/order/$SELL_ID")
node -e 'const v=JSON.parse(process.argv[1]); if(v.status!=="filled" || v.filledQty!==0.01) process.exit(1)' "$SELL_AFTER"

DEPTH_AFTER=$(curl -fsS http://127.0.0.1:3000/depth/BTCUSDC)
node -e 'const v=JSON.parse(process.argv[1]); if(v.bids.length||v.asks.length) process.exit(1)' "$DEPTH_AFTER"

echo "PASS: V1 API signup, manual order entry, Redis RPC, fill, and depth smoke test"
