import { notFound } from "next/navigation";
import PlaylistView, { type PlaylistData, type TrackData } from "@/components/PlaylistView";
import { db, type PlaylistRow, type UserRow } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function PlaylistPage({
  params,
}: {
  params: Promise<{ shareId: string }>;
}) {
  const { shareId } = await params;
  const playlist = db
    .prepare("SELECT * FROM playlists WHERE share_id = ?")
    .get(shareId) as PlaylistRow | undefined;
  if (!playlist) notFound();

  const user = await getCurrentUser();
  const isOwner = user?.id === playlist.owner_id;
  if (!playlist.is_public && !isOwner) notFound();

  const owner = db
    .prepare("SELECT username, display_name, avatar_url FROM users WHERE id = ?")
    .get(playlist.owner_id) as Pick<UserRow, "username" | "display_name" | "avatar_url">;

  const tracks = db
    .prepare(
      `SELECT t.id, t.spotify_id AS spotifyId, t.name, t.artists, t.album,
              t.album_art AS albumArt, t.duration_ms AS durationMs
       FROM playlist_tracks pt
       JOIN tracks t ON t.id = pt.track_id
       WHERE pt.playlist_id = ?
       ORDER BY pt.position`
    )
    .all(playlist.id) as TrackData[];

  const totals = db
    .prepare(
      "SELECT COUNT(*) AS plays, COUNT(DISTINCT user_id) AS listeners FROM plays WHERE playlist_id = ?"
    )
    .get(playlist.id) as { plays: number; listeners: number };

  const data: PlaylistData = {
    id: playlist.id,
    shareId: playlist.share_id,
    name: playlist.name,
    description: playlist.description,
    coverUrl: playlist.cover_url,
    isPublic: Boolean(playlist.is_public),
    ownerUsername: owner.username,
    plays: totals.plays,
    listeners: totals.listeners,
  };

  return (
    <PlaylistView
      playlist={data}
      initialTracks={tracks}
      isOwner={isOwner}
      isLoggedIn={Boolean(user)}
    />
  );
}
