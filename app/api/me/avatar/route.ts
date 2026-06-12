import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

const ALLOWED = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const MAX_SIZE = 2 * 1024 * 1024; // 2 Mo

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("avatar");
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
  db.prepare("UPDATE users SET avatar_url = ? WHERE id = ?").run(dataUrl, user.id);
  return NextResponse.json({ ok: true, avatarUrl: dataUrl });
}
