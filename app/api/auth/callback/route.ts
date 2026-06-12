import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { db, type UserRow } from "@/lib/db";
import { createSession } from "@/lib/session";
import { appUrl, exchangeCode, SPOTIFY_API } from "@/lib/spotify";

type SpotifyProfile = {
  id: string;
  display_name: string | null;
  product?: string;
  images?: { url: string }[];
};

export async function GET(req: NextRequest) {
  const base = appUrl();
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const error = req.nextUrl.searchParams.get("error");

  const jar = await cookies();
  const expectedState = jar.get("sp_state")?.value;
  jar.delete("sp_state");

  if (error) return NextResponse.redirect(`${base}/?error=denied`);
  if (!code || !state || state !== expectedState) {
    return NextResponse.redirect(`${base}/?error=state`);
  }

  try {
    const tokens = await exchangeCode(code);

    const profileRes = await fetch(`${SPOTIFY_API}/me`, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
      cache: "no-store",
    });
    if (!profileRes.ok) throw new Error(`profile ${profileRes.status}`);
    const profile: SpotifyProfile = await profileRes.json();

    const expiresAt = Math.floor(Date.now() / 1000) + tokens.expires_in;
    const existing = db
      .prepare("SELECT * FROM users WHERE spotify_id = ?")
      .get(profile.id) as UserRow | undefined;

    let userId: number;
    if (existing) {
      db.prepare(
        `UPDATE users SET access_token = ?, refresh_token = COALESCE(?, refresh_token),
         token_expires_at = ?, spotify_product = ? WHERE id = ?`
      ).run(
        tokens.access_token,
        tokens.refresh_token ?? null,
        expiresAt,
        profile.product ?? null,
        existing.id
      );
      userId = existing.id;
    } else {
      const result = db
        .prepare(
          `INSERT INTO users (spotify_id, display_name, avatar_url, spotify_product,
           access_token, refresh_token, token_expires_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          profile.id,
          profile.display_name,
          profile.images?.[0]?.url ?? null,
          profile.product ?? null,
          tokens.access_token,
          tokens.refresh_token ?? null,
          expiresAt
        );
      userId = Number(result.lastInsertRowid);
    }

    await createSession(userId);

    const user = db.prepare("SELECT username FROM users WHERE id = ?").get(userId) as {
      username: string | null;
    };
    return NextResponse.redirect(user.username ? base : `${base}/onboarding`);
  } catch (e) {
    console.error("Spotify callback failed:", e);
    return NextResponse.redirect(`${base}/?error=spotify`);
  }
}
