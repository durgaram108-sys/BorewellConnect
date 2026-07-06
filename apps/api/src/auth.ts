import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "./env";

export type Role = "customer" | "owner" | "admin";

export interface AuthTokenPayload {
  sub: string;
  role: Role;
}

export function signToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn as jwt.SignOptions["expiresIn"] });
}

export interface AuthedRequest extends Request {
  auth?: AuthTokenPayload;
}

export function requireAuth(...roles: Role[]) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing bearer token" });
    }
    try {
      const payload = jwt.verify(header.slice(7), env.jwtSecret) as AuthTokenPayload;
      if (roles.length && !roles.includes(payload.role)) {
        return res.status(403).json({ error: "Forbidden for this role" });
      }
      req.auth = payload;
      next();
    } catch {
      return res.status(401).json({ error: "Invalid or expired token" });
    }
  };
}
