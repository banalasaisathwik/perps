import { getBalance } from "./getBalance";

export function lockMargin(
  userId: string,
  margin: number
) {
  const balance = getBalance(userId);

  if (balance.available < margin) {
    throw new Error("insufficient balance");
  }

  balance.available -= margin;
  balance.locked += margin;
}