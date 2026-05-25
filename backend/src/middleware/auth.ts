import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

export interface TokenPayload {
  userId: string;
}

export function createToken(payload: TokenPayload): string {
  return jwt.sign(payload, "secret", { expiresIn: "7d" });
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token =
    typeof authHeader === "string" && authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : undefined;

  if (!token) {
    res.status(401).json({ error: "Missing auth token" });
    return;
  }

  try {
    const payload = jwt.verify(token,"secret") as TokenPayload
    const userId = payload.userId
    req.userId = userId
    next()
  } catch (error) {
    res.status(401).json({ error: "Invalid auth token" });
  }
  
}
