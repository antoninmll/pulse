import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import {
  normalizeTrack,
  parseSpotifyLink,
  spotifyFetch,
  type SpotifyTrack,
} from "@/lib/spotify";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const url = req.nextUrl.searchParams.get("url") ?? "";
  const parsed = parseSpotifyLink(url);
  if (!parsed) {
    return NextResponse.json(
      { error: "Lien Spotify non reconnu (lien de morceau ou de playlist attendu)" },
      { status: 400 }
    );
  }

  if (parsed.type === "playlist") {
    return NextResponse.json({ type: "playlist", playlistId: parsed.id });
  }

  try {
    const track = await spotifyFetch<SpotifyTrack>(user, `/tracks/${parsed.id}`);
    return NextResponse.json({ type: "track", track: normalizeTrack(track) });
  } catch (e) {
    console.error("Resolve link failed:", e);
    return NextResponse.json({ error: "Morceau introuvable sur Spotify" }, { status: 404 });
  }
}
