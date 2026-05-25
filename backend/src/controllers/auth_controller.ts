import type { Request,Response } from "express";
import { authZodPayload } from "../utlis/zod/auth_validations";
import { prisma } from "../db";
import bcrypt from "bcrypt"
import { createToken } from "../middleware/auth";

export async function signup(req: Request, res: Response) {

  const parsedRequest = authZodPayload.safeParse(req.body);

  if (!parsedRequest.success) {
    throw Error("wrong payload structure");
  }

  const { username, password } = parsedRequest.data;

  const exisitinUser = await prisma.user.findFirst({
    where: { username: username },
  });

  if(exisitinUser){
    res.status(401).send({"error":"User Already exist"})
    return
  }

  const hashedPass = await bcrypt.hash(password,2)

  const newUser = await prisma.user.create({
    data:{
        username : username,
        password : hashedPass
    }
  })

  res.status(201).send({
    token : createToken({userId : newUser.id}),
    userId : newUser.id,
    username : newUser.username
  })
}

export async function signin(req: Request, res: Response) {
  const parsedRequest = authZodPayload.safeParse(req.body);

  if (!parsedRequest.success) {
    throw Error("wrong payload structure");
  }

  const { username, password } = parsedRequest.data;

  const user = await prisma.user.findFirst({
    where :{ username : username}
  })

  if(!user){
        res.status(401).send({"error":"wrong credentials"})
        return
  }
  
  const veriftyPass = await bcrypt.compare(password,user.password)

  if(!veriftyPass){
    res.status(401).send({"error":"wrong credentials"})
    return
  }
  res.status(201).send({
    token : createToken({userId : user.id}),
    userId : user.id,
    username : user.username
  })

}
