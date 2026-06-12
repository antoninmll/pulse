import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getValidAccessToken } from "@/lib/spotify";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  try {
    const accessToken = await getValidAccessToken(user);
    return NextResponse.json({ accessToken, product: user.spotify_product });
  } catch (e) {
    console.error("Token refresh failed:", e);
    return NextResponse.json({ error: "Reconnecte-toi à Spotify" }, { status: 401 });
  }
}
