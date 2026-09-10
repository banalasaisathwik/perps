import { BALANCES, type Balance } from "../store/memory";

// Paper-trading users start with generous virtual collateral for experiments.
const DEFAULT_DEMO_BALANCE = Number(process.env.DEMO_STARTING_BALANCE ?? 1_000_000_000);

export function getBalance(userId : string,symbol? : string){
    const Userbalances = BALANCES.get(userId)
    
    if(!Userbalances){
        const usdBalance : Balance = {available : DEFAULT_DEMO_BALANCE,locked:0}
        BALANCES.set(userId,usdBalance)
    }

    const Balance = BALANCES.get(userId)!

        return Balance
}
