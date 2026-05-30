import type { OrderRequest } from "..";
import { POSITIONS } from "../store/memory";
import { getBalance } from "../utils/getBalance";
import { getUserBalancesPayload } from "../zodValidations/validations";

export function getUserBalances(message: OrderRequest) {
  const parsedPayload = getUserBalancesPayload.safeParse(message.payload);
  if (!parsedPayload.success) {
    throw new Error("Get User Balances Payload structure issue");
  }

  const { userId } = parsedPayload.data;
  const balance = getBalance(userId);
  const positions = POSITIONS.get(userId) ?? [];

  return {
    balance,
    positions,
  };
}
