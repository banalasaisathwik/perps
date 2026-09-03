import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

export interface TokenPayload {
  userId: string;
}

function loadJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      "JWT_SECRET is not set. Add JWT_SECRET=<a long random string> to backend/.env",
    );
  }
  return secret;
}

const JWT_SECRET = loadJwtSecret();

export function createToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
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
    const payload = jwt.verify(token, JWT_SECRET) as TokenPayload
    const userId = payload.userId
    req.userId = userId
    next()
  } catch (error) {
    res.status(401).json({ error: "Invalid auth token" });
  }
  
}
