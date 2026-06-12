"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import Avatar from "./Avatar";
import { useSettings } from "./SettingsProvider";
import { usePlayer } from "./PlayerProvider";
import { IconVolume, IconWave } from "./icons";

type ProfileData = {
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string | null;
  product: string | null;
};

export default function ProfileForm({ initial }: { initial: ProfileData }) {
  const router = useRouter();
  const { settings, update: updateSettings } = useSettings();
  const { volume, setVolume } = usePlayer();
  const fileRef = useRef<HTMLInputElement>(null);
  const [username, setUsername] = useState(initial.username);
  const [displayName, setDisplayName] = useState(initial.displayName);
  const [bio, setBio] = useState(initial.bio);
  const [avatarUrl, setAvatarUrl] = useState(initial.avatarUrl);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  async function uploadAvatar(file: File) {
    setMessage(null);
    const form = new FormData();
    form.append("avatar", file);
    const res = await fetch("/api/me/avatar", { method: "POST", body: form });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setAvatarUrl(data.avatarUrl);
      setMessage({ type: "ok", text: "Photo de profil mise à jour ✓" });
      router.refresh();
    } else {
      setMessage({ type: "error", text: data.error ?? "Envoi impossible" });
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    const res = await fetch("/api/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, displayName, bio }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (res.ok) {
      setMessage({ type: "ok", text: "Profil enregistré ✓" });
      router.refresh();
    } else {
      setMessage({ type: "error", text: data.error ?? "Enregistrement impossible" });
    }
  }

  return (
    <div className="mx-auto max-w-xl pt-4">
      <p className="eyebrow">Mon compte</p>
      <h1 className="font-display mt-1 text-3xl font-semibold tracking-tight">
        Profil <span className="gold-text">@{initial.username}</span>
      </h1>

      <div className="card mt-6 p-6">
        <div className="flex items-center gap-5">
          <Avatar src={avatarUrl} name={username} size={88} />
          <div>
            <button onClick={() => fileRef.current?.click()} className="btn-ghost text-sm">
              Changer la photo de profil
            </button>
            <p className="mt-2 text-xs text-muted">PNG, JPEG, WebP ou GIF — 2 Mo max.</p>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadAvatar(f);
                e.target.value = "";
              }}
            />
          </div>
        </div>

        <form onSubmit={save} className="mt-6 space-y-5">
          <div>
            <label htmlFor="username" className="mb-1.5 block text-sm font-medium">
              Nom d&apos;utilisateur
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted">
                @
              </span>
              <input
                id="username"
                className="input input-prefixed"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                minLength={3}
                maxLength={20}
                pattern="[a-zA-Z0-9_]+"
                required
              />
            </div>
          </div>
          <div>
            <label htmlFor="displayName" className="mb-1.5 block text-sm font-medium">
              Nom affiché
            </label>
            <input
              id="displayName"
              className="input"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={50}
            />
          </div>
          <div>
            <label htmlFor="bio" className="mb-1.5 block text-sm font-medium">
              Bio
            </label>
            <textarea
              id="bio"
              className="input resize-none"
              rows={3}
              placeholder="Quelques mots sur toi et ta musique…"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={300}
            />
          </div>

          {message && (
            <p
              className={`text-sm ${message.type === "ok" ? "text-gold" : "text-red-400"}`}
            >
              {message.text}
            </p>
          )}

          <button type="submit" disabled={saving} className="btn-primary w-full justify-center">
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </form>
      </div>

      <div className="card mt-4 p-5">
        <p className="eyebrow">Paramètres</p>
        <div className="mt-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-gold/30 bg-gold/10 text-gold">
              <IconWave size={17} />
            </span>
            <div>
              <p className="text-sm font-medium">Visualiseur audio</p>
              <p className="text-xs text-muted">
                Barres animées dans la fenêtre de lecture en bas de l&apos;écran.
              </p>
            </div>
          </div>
          <button
            role="switch"
            aria-checked={settings.visualizer}
            onClick={() => updateSettings({ visualizer: !settings.visualizer })}
            className={`relative h-6 w-11 shrink-0 rounded-full transition ${
              settings.visualizer ? "bg-gold" : "bg-white/15"
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-[#0a0a0b] transition-all ${
                settings.visualizer ? "left-[22px]" : "left-0.5"
              }`}
            />
          </button>
        </div>

        <div className="mt-5 flex items-center justify-between gap-4 border-t border-white/5 pt-5">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-gold/30 bg-gold/10 text-gold">
              <IconVolume size={17} />
            </span>
            <div>
              <p className="text-sm font-medium">Volume du lecteur</p>
              <p className="text-xs text-muted">
                Synchronisé avec ton compte — conservé d&apos;un appareil à l&apos;autre.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(volume * 100)}
              onChange={(e) => setVolume(Number(e.target.value) / 100)}
              className="h-1 w-28 cursor-pointer"
              aria-label="Volume"
            />
            <span className="w-8 text-right text-xs tabular-nums text-muted">
              {Math.round(volume * 100)}%
            </span>
          </div>
        </div>
      </div>

      <div className="card mt-4 flex items-center justify-between p-5">
        <div>
          <p className="text-sm font-medium">Compte Spotify lié</p>
          <p className="text-xs text-muted">
            Abonnement : {initial.product === "premium" ? "Premium" : initial.product ?? "inconnu"}
            {initial.product !== "premium" && " — la lecture intégrale nécessite Premium"}
          </p>
        </div>
        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className="btn-ghost border-red-500/40 text-sm text-red-300 hover:border-red-500/60 hover:text-red-200"
          >
            Se déconnecter
          </button>
        </form>
      </div>
    </div>
  );
}
