import { BALANCES } from "../store/memory";
import { getBalance } from "./getBalance";

export function unlockMargin(userId : string,margin : number){
    const balance = getBalance(userId)
    if(margin <= 0){
        return
    }
    const amountToUnlock = Math.min(balance.locked,margin)

    balance.locked -= amountToUnlock
    balance.available += amountToUnlock

    BALANCES.set(userId,balance)
}
