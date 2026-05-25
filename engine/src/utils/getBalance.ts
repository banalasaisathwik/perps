import { BALANCES, type Balance } from "../store/memory";

export function getBalance(userId : string,symbol? : string){
    const Userbalances = BALANCES.get(userId)
    if(!Userbalances){
        const usdBalance : Balance = {available : 10000,locked:0}
        BALANCES.set(userId,usdBalance)
    }

    const Balance = BALANCES.get(userId)!

        return Balance
}