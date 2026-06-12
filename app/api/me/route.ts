import { NextRequest, NextResponse } from "next/server";
import { db, publicUser } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  return NextResponse.json({ user: { ...publicUser(user), product: user.spotify_product } });
}

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const updates: string[] = [];
  const values: unknown[] = [];

  if (typeof body.displayName === "string") {
    const name = body.displayName.trim().slice(0, 50);
    if (!name) return NextResponse.json({ error: "Le nom affiché est vide" }, { status: 400 });
    updates.push("display_name = ?");
    values.push(name);
  }
  if (typeof body.bio === "string") {
    updates.push("bio = ?");
    values.push(body.bio.trim().slice(0, 300));
  }
  if (typeof body.username === "string" && body.username !== user.username) {
    if (!USERNAME_RE.test(body.username)) {
      return NextResponse.json(
        { error: "Nom d'utilisateur invalide (3 à 20 caractères : lettres, chiffres, _)" },
        { status: 400 }
      );
    }
    const taken = db
      .prepare("SELECT id FROM users WHERE username = ? COLLATE NOCASE AND id != ?")
      .get(body.username, user.id);
    if (taken) {
      return NextResponse.json({ error: "Ce nom d'utilisateur est déjà pris" }, { status: 409 });
    }
    updates.push("username = ?");
    values.push(body.username);
  }

  if (updates.length === 0) return NextResponse.json({ ok: true });
  values.push(user.id);
  db.prepare(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`).run(...values);
  return NextResponse.json({ ok: true });
}
