import crypto from "crypto";
import { cookies } from "next/headers";
import { db, type UserRow } from "./db";

const COOKIE_NAME = "pulse_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 jours

function secret(): string {
  return process.env.SESSION_SECRET || "dev-secret-change-me";
}

function sign(value: string): string {
  return crypto.createHmac("sha256", secret()).update(value).digest("base64url");
}

export function sealSession(userId: number): string {
  const payload = Buffer.from(
    JSON.stringify({ uid: userId, exp: Math.floor(Date.now() / 1000) + MAX_AGE })
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function unsealSession(token: string | undefined): number | null {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (typeof data.uid !== "number" || data.exp < Date.now() / 1000) return null;
    return data.uid;
  } catch {
    return null;
  }
}

export async function createSession(userId: number) {
  const jar = await cookies();
  jar.set(COOKIE_NAME, sealSession(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && process.env.APP_URL?.startsWith("https"),
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession() {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

export async function getSessionUserId(): Promise<number | null> {
  const jar = await cookies();
  return unsealSession(jar.get(COOKIE_NAME)?.value);
}

export async function getCurrentUser(): Promise<UserRow | null> {
  const uid = await getSessionUserId();
  if (uid === null) return null;
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(uid) as UserRow | undefined;
  return user ?? null;
}
