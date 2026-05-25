import 'dotenv/config'
import express, { type NextFunction,type Request,type Response} from 'express'
import cors from 'cors'
import { appRouter } from './routes'
import { connectRedis, listenForEngineResponse } from './redis/engine-client'

await connectRedis()
// we have to catch for safety ,it attches to promises and call we something goes bad
void listenForEngineResponse().catch((error) => {
    console.error("engine response listener stopped", error)
})

const app = express()

app.use(cors())
app.use(express.json())
app.use(appRouter)

app.use(ErrorHandler)


function ErrorHandler(err :unknown,_req:Request,res:Response,_next : NextFunction){
    console.log(err)

    res.status(500).send({
        error : (err instanceof Error) ? err.message : "server error"
    })
}

app.listen(3000,()=>{
    console.log("backend server started 3000");  
})
