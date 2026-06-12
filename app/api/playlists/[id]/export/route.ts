import { NextRequest, NextResponse } from "next/server";
import { db, type PlaylistRow } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { spotifyFetch, spotifyPost } from "@/lib/spotify";

type TrackData = {
  spotifyId: string;
};

type SpotifyProfile = {
  id: string;
};

type SpotifyNewPlaylist = {
  id: string;
  external_urls: {
    spotify: string;
  };
};

export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const { id } = await ctx.params;
  const playlistId = Number(id);

  const playlist = db.prepare("SELECT * FROM playlists WHERE id = ?").get(playlistId) as
    | PlaylistRow
    | undefined;

  if (!playlist || playlist.owner_id !== user.id) {
    return NextResponse.json({ error: "Playlist introuvable" }, { status: 404 });
  }

  // Récupérer les tracks
  const tracks = db
    .prepare(
      `SELECT t.spotify_id AS spotifyId
       FROM playlist_tracks pt
       JOIN tracks t ON t.id = pt.track_id
       WHERE pt.playlist_id = ?
       ORDER BY pt.position`
    )
    .all(playlist.id) as TrackData[];

  if (tracks.length === 0) {
    return NextResponse.json({ error: "La playlist est vide" }, { status: 400 });
  }

  try {
    // 1. Récupérer l'ID Spotify de l'utilisateur
    const profile = await spotifyFetch<SpotifyProfile>(user, "/me");
    const spotifyUserId = profile.id;

    // 2. Créer la playlist sur Spotify
    const newPlaylist = await spotifyPost<SpotifyNewPlaylist>(
      user,
      `/users/${spotifyUserId}/playlists`,
      {
        name: `[Pulse] ${playlist.name}`,
        description: playlist.description || "Playlist exportée depuis l'application Pulse",
        public: false,
      }
    );

    const spotifyPlaylistId = newPlaylist.id;
    const spotifyUrl = newPlaylist.external_urls.spotify;

    // 3. Ajouter les morceaux par paquets de 100
    const uris = tracks.map((t) => `spotify:track:${t.spotifyId}`);
    for (let i = 0; i < uris.length; i += 100) {
      const chunk = uris.slice(i, i + 100);
      await spotifyPost(user, `/playlists/${spotifyPlaylistId}/tracks`, {
        uris: chunk,
      });
    }

    return NextResponse.json({ ok: true, spotifyUrl });
  } catch (e: any) {
    console.error("Export to Spotify failed:", e);
    return NextResponse.json(
      { error: "Une erreur est survenue lors de l'export vers Spotify" },
      { status: 500 }
    );
  }
}
