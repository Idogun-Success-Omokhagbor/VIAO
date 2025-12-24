import { SignJWT, jwtVerify, type JWTPayload } from "jose"
import type { Role } from "@prisma/client"

const encoder = new TextEncoder()

function getSecretKey() {
  const secret = process.env.AUTH_SECRET
  if (!secret) {
    throw new Error("AUTH_SECRET is not set")
  }
  return encoder.encode(secret)
}

export interface SessionPayload extends JWTPayload {
  sub: string
  role: Role
  email: string
}

export async function createSessionToken(payload: SessionPayload) {
  const secretKey = getSecretKey()
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secretKey)
}

export async function verifySessionToken(token: string) {
  const secretKey = getSecretKey()
  const { payload } = await jwtVerify<SessionPayload>(token, secretKey, {
    algorithms: ["HS256"],
  })
  return payload
}
