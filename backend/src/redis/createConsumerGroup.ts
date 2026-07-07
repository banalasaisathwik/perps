import type { RedisClient } from "./engine-client";

export async function createConsumerGroup(client:RedisClient,groupName : string,streamName : string){
    try {
        await client.xGroupCreate(
            streamName,groupName,"$",{MKSTREAM : true}
        )
    } catch (error) {
        console.log(error);
        
    }
}