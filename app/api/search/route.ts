import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { normalizeTrack, spotifyFetch, type SpotifyTrack } from "@/lib/spotify";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ tracks: [] });

  try {
    const data = await spotifyFetch<{ tracks: { items: SpotifyTrack[] } }>(
      user,
      `/search?type=track&limit=12&q=${encodeURIComponent(q)}`
    );
    return NextResponse.json({ tracks: data.tracks.items.map(normalizeTrack) });
  } catch (e) {
    console.error("Search failed:", e);
    return NextResponse.json({ error: "La recherche Spotify a échoué" }, { status: 502 });
  }
}
