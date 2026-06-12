import { NextRequest, NextResponse } from "next/server";
import { db, newShareId } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import {
  normalizeTrack,
  parseSpotifyLink,
  spotifyFetch,
  SpotifyApiError,
  upsertTrack,
  type SpotifyTrack,
} from "@/lib/spotify";

type SpotifyPlaylist = {
  name: string;
  description: string | null;
  images?: { url: string }[];
};

// Spotify a migré /playlists/{id}/tracks vers /playlists/{id}/items :
// le morceau est sous `item` (anciennement `track`) et is_local au niveau de l'entrée.
type PlaylistItemsPage = {
  items: {
    is_local?: boolean;
    item?: (SpotifyTrack & { is_local?: boolean }) | null;
    track?: (SpotifyTrack & { is_local?: boolean }) | null;
  }[];
  next: string | null;
};

type MyPlaylistsPage = {
  items: {
    id: string;
    name: string;
    images?: { url: string }[] | null;
    // Absent des réponses pour les apps en mode développement
    tracks?: { total: number } | null;
    owner: { display_name?: string };
  }[];
  next: string | null;
};

/** Liste les playlists du compte Spotify de l'utilisateur (pour le sélecteur d'import). */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  try {
    const playlists: MyPlaylistsPage["items"] = [];
    let offset = 0;
    for (let page = 0; page < 2; page++) {
      const data = await spotifyFetch<MyPlaylistsPage>(
        user,
        `/me/playlists?limit=50&offset=${offset}`
      );
      playlists.push(...data.items.filter(Boolean));
      if (!data.next) break;
      offset += 50;
    }
    return NextResponse.json({
      playlists: playlists.map((p) => ({
        spotifyId: p.id,
        name: p.name,
        coverUrl: p.images?.[0]?.url ?? null,
        trackCount: p.tracks?.total ?? null,
        owner: p.owner?.display_name ?? null,
      })),
    });
  } catch (e) {
    console.error("List Spotify playlists failed:", e);
    return NextResponse.json(
      { error: "Impossible de récupérer tes playlists Spotify" },
      { status: 502 }
    );
  }
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const body = await req.json().catch(() => ({}));

  // Import direct par id (sélecteur) ou via un lien collé
  let spotifyId: string | null = null;
  if (typeof body.spotifyId === "string" && /^[A-Za-z0-9]{8,}$/.test(body.spotifyId)) {
    spotifyId = body.spotifyId;
  } else {
    const parsed = parseSpotifyLink(typeof body.url === "string" ? body.url : "");
    if (parsed?.type === "playlist") spotifyId = parsed.id;
  }
  if (!spotifyId) {
    return NextResponse.json({ error: "Colle un lien de playlist Spotify valide" }, { status: 400 });
  }

  try {
    const meta = await spotifyFetch<SpotifyPlaylist>(
      user,
      `/playlists/${spotifyId}?fields=name,description,images`
    );

    const tracks: ReturnType<typeof normalizeTrack>[] = [];
    let offset = 0;
    for (let page = 0; page < 20; page++) {
      // NB : le paramètre `fields` casse la réponse sur ce nouvel endpoint — ne pas l'utiliser
      const data = await spotifyFetch<PlaylistItemsPage>(
        user,
        `/playlists/${spotifyId}/items?limit=100&offset=${offset}`
      );
      for (const entry of data.items) {
        const t = entry.item ?? entry.track;
        if (t && t.id && !entry.is_local && !t.is_local) {
          tracks.push(normalizeTrack(t));
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
    if (e instanceof SpotifyApiError && (e.status === 403 || e.status === 404)) {
      return NextResponse.json(
        {
          error:
            "Spotify bloque l'accès à cette playlist : les playlists générées par Spotify " +
            "(Daily Mix, Découvertes, Blend, Top 50…) ne sont pas accessibles aux applications " +
            "tierces. Choisis une playlist créée par toi ou un autre utilisateur.",
        },
        { status: 403 }
      );
    }
    return NextResponse.json(
      { error: "Import impossible — vérifie que la playlist est publique ou t'appartient" },
      { status: 502 }
    );
  }
}
