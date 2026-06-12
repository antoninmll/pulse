import { NextRequest, NextResponse } from "next/server";
import { db, newShareId } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import {
  normalizeTrack,
  parseSpotifyLink,
  spotifyFetch,
  upsertTrack,
  type SpotifyTrack,
} from "@/lib/spotify";

type SpotifyPlaylist = {
  name: string;
  description: string | null;
  images?: { url: string }[];
};

type PlaylistTracksPage = {
  items: { track: (SpotifyTrack & { is_local?: boolean }) | null }[];
  next: string | null;
};

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = parseSpotifyLink(typeof body.url === "string" ? body.url : "");
  if (!parsed || parsed.type !== "playlist") {
    return NextResponse.json({ error: "Colle un lien de playlist Spotify valide" }, { status: 400 });
  }

  try {
    const meta = await spotifyFetch<SpotifyPlaylist>(
      user,
      `/playlists/${parsed.id}?fields=name,description,images`
    );

    const tracks: ReturnType<typeof normalizeTrack>[] = [];
    let offset = 0;
    for (let page = 0; page < 20; page++) {
      const data = await spotifyFetch<PlaylistTracksPage>(
        user,
        `/playlists/${parsed.id}/tracks?limit=100&offset=${offset}` +
          `&fields=next,items(track(id,name,duration_ms,is_local,artists(name),album(name,images)))`
      );
      for (const item of data.items) {
        if (item.track && item.track.id && !item.track.is_local) {
          tracks.push(normalizeTrack(item.track));
        }
      }
      if (!data.next) break;
      offset += 100;
    }

    if (tracks.length === 0) {
      return NextResponse.json(
        { error: "Cette playlist ne contient aucun morceau importable" },
        { status: 400 }
      );
    }

    const shareId = newShareId();
    const importAll = db.transaction(() => {
      const result = db
        .prepare(
          "INSERT INTO playlists (share_id, owner_id, name, description, cover_url, is_public) VALUES (?, ?, ?, ?, ?, 1)"
        )
        .run(
          shareId,
          user.id,
          meta.name.slice(0, 100) || "Playlist importée",
          (meta.description ?? "").slice(0, 300),
          meta.images?.[0]?.url ?? null
        );
      const playlistId = Number(result.lastInsertRowid);
      const insert = db.prepare(
        "INSERT OR IGNORE INTO playlist_tracks (playlist_id, track_id, position) VALUES (?, ?, ?)"
      );
      tracks.forEach((t, i) => insert.run(playlistId, upsertTrack(t), i));
    });
    importAll();

    return NextResponse.json({ ok: true, shareId, count: tracks.length });
  } catch (e) {
    console.error("Import failed:", e);
    return NextResponse.json(
      { error: "Import impossible — vérifie que la playlist est publique ou t'appartient" },
      { status: 502 }
    );
  }
}
