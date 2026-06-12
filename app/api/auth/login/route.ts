import crypto from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { appUrl, getAuthUrl, isConfigured } from "@/lib/spotify";

export async function GET() {
  if (!isConfigured()) {
    return NextResponse.redirect(`${appUrl()}/?error=config`);
  }
  const state = crypto.randomBytes(16).toString("hex");
  const jar = await cookies();
  jar.set("sp_state", state, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return NextResponse.redirect(getAuthUrl(state));
}
