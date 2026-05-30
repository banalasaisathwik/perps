import { POSITIONS, type OrderRecord, type Postion } from "../store/memory";
import { caluculateLiquidation } from "./caluculateLiquidation";

export function openPosition(
  order: OrderRecord,
  qtyToOpen: number,
  marginLocked: number,
  entryPrice: number,
) {
  const userPositions = POSITIONS.get(order.userId) ?? [];

  const existingPosition = userPositions.find(
    (p) => p.symbol === order.symbol && p.side === order.side,
  );

  if (!existingPosition) {
    const position: Postion = {
      orderId: order.orderId,
      symbol: order.symbol,
      side: order.side,
      qty: qtyToOpen,
      margin: marginLocked,
      leverage: order.leverage,
      liquidationPrice: 0,
      pnL: null,
      averagePrice: entryPrice,
    };

    position.liquidationPrice = caluculateLiquidation(position);

    userPositions.push(position);
    POSITIONS.set(order.userId, userPositions);

    return;
  }

  const totalQty = existingPosition.qty + qtyToOpen;

  existingPosition.averagePrice =
    (existingPosition.averagePrice * existingPosition.qty + entryPrice * qtyToOpen) / totalQty;

  existingPosition.qty += qtyToOpen;

  existingPosition.margin += marginLocked;

  existingPosition.liquidationPrice = caluculateLiquidation(existingPosition);
}
