import { NextRequest, NextResponse } from "next/server";
import { db, type PlaylistRow } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

async function ownedPlaylist(id: string) {
  const user = await getCurrentUser();
  if (!user) return { error: NextResponse.json({ error: "Non connecté" }, { status: 401 }) };
  const playlist = db.prepare("SELECT * FROM playlists WHERE id = ?").get(Number(id)) as
    | PlaylistRow
    | undefined;
  if (!playlist || playlist.owner_id !== user.id) {
    return { error: NextResponse.json({ error: "Playlist introuvable" }, { status: 404 }) };
  }
  return { user, playlist };
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const found = await ownedPlaylist(id);
  if ("error" in found) return found.error;

  const body = await req.json().catch(() => ({}));
  const updates: string[] = [];
  const values: unknown[] = [];

  if (typeof body.name === "string") {
    const name = body.name.trim().slice(0, 100);
    if (!name) return NextResponse.json({ error: "Le nom est vide" }, { status: 400 });
    updates.push("name = ?");
    values.push(name);
  }
  if (typeof body.description === "string") {
    updates.push("description = ?");
    values.push(body.description.trim().slice(0, 300));
  }
  if (typeof body.isPublic === "boolean") {
    updates.push("is_public = ?");
    values.push(body.isPublic ? 1 : 0);
  }

  if (updates.length > 0) {
    values.push(found.playlist.id);
    db.prepare(`UPDATE playlists SET ${updates.join(", ")} WHERE id = ?`).run(...values);
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const found = await ownedPlaylist(id);
  if ("error" in found) return found.error;

  db.prepare("DELETE FROM playlists WHERE id = ?").run(found.playlist.id);
  return NextResponse.json({ ok: true });
}
