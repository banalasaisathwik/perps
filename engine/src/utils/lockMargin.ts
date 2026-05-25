import { BALANCES } from "../store/memory";
import { getBalance } from "./getBalance";

export function lockMargin(userId : string , margin : number){
    const balance = getBalance(userId)

    balance.available -=margin
    balance.locked += margin

    return
}