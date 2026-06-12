import { NextRequest, NextResponse } from "next/server";
import { db, type PlaylistRow } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

const ALLOWED = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const MAX_SIZE = 2 * 1024 * 1024; // 2 Mo

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

/** Définit une cover personnalisée (remplace la cover automatique). */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const found = await ownedPlaylist(id);
  if ("error" in found) return found.error;

  const form = await req.formData().catch(() => null);
  const file = form?.get("cover");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Aucun fichier reçu" }, { status: 400 });
  }
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json({ error: "Format accepté : PNG, JPEG, WebP ou GIF" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Image trop lourde (2 Mo maximum)" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const dataUrl = `data:${file.type};base64,${buffer.toString("base64")}`;
  db.prepare("UPDATE playlists SET cover_url = ? WHERE id = ?").run(dataUrl, found.playlist.id);
  return NextResponse.json({ ok: true, coverUrl: dataUrl });
}

/** Supprime la cover personnalisée : retour à la cover automatique. */
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const found = await ownedPlaylist(id);
  if ("error" in found) return found.error;

  db.prepare("UPDATE playlists SET cover_url = NULL WHERE id = ?").run(found.playlist.id);
  return NextResponse.json({ ok: true, coverUrl: null });
}
