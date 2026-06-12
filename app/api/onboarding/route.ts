import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const { username } = await req.json().catch(() => ({}));
  if (typeof username !== "string" || !USERNAME_RE.test(username)) {
    return NextResponse.json(
      { error: "Nom d'utilisateur invalide (3 à 20 caractères : lettres, chiffres, _)" },
      { status: 400 }
    );
  }

  const taken = db
    .prepare("SELECT id FROM users WHERE username = ? COLLATE NOCASE AND id != ?")
    .get(username, user.id);
  if (taken) {
    return NextResponse.json({ error: "Ce nom d'utilisateur est déjà pris" }, { status: 409 });
  }

  db.prepare("UPDATE users SET username = ? WHERE id = ?").run(username, user.id);
  return NextResponse.json({ ok: true });
}
