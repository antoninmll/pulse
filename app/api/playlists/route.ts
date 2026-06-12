import { NextRequest, NextResponse } from "next/server";
import { db, newShareId } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const playlists = db
    .prepare(
      `SELECT p.id, p.share_id AS shareId, p.name, p.description, p.cover_url AS coverUrl,
              p.is_public AS isPublic, p.created_at AS createdAt,
              (SELECT COUNT(*) FROM playlist_tracks pt WHERE pt.playlist_id = p.id) AS trackCount,
              (SELECT COUNT(*) FROM plays pl WHERE pl.playlist_id = p.id) AS playCount
       FROM playlists p WHERE p.owner_id = ? ORDER BY p.created_at DESC`
    )
    .all(user.id);
  return NextResponse.json({ playlists });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 100) : "";
  if (!name) return NextResponse.json({ error: "Donne un nom à ta playlist" }, { status: 400 });

  const description =
    typeof body.description === "string" ? body.description.trim().slice(0, 300) : "";
  const isPublic = body.isPublic === false ? 0 : 1;
  const shareId = newShareId();

  db.prepare(
    "INSERT INTO playlists (share_id, owner_id, name, description, is_public) VALUES (?, ?, ?, ?, ?)"
  ).run(shareId, user.id, name, description, isPublic);

  return NextResponse.json({ ok: true, shareId });
}
