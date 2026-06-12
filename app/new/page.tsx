"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function NewPlaylistForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [tab, setTab] = useState<"create" | "import">(
    params.get("tab") === "import" ? "import" : "create"
  );

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [importUrl, setImportUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function createPlaylist(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/playlists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description, isPublic }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      router.push(`/p/${data.shareId}`);
    } else {
      setError(data.error ?? "Une erreur est survenue");
      setLoading(false);
    }
  }

  async function importPlaylist(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/playlists/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: importUrl }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      router.push(`/p/${data.shareId}`);
    } else {
      setError(data.error ?? "Import impossible");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl pt-8">
      <h1 className="font-display text-3xl font-semibold tracking-tight">
        Nouvelle <span className="gold-text">playlist</span>
      </h1>

      <div className="card mt-6 flex gap-1 p-1.5">
        {(
          [
            ["create", "Créer de zéro"],
            ["import", "Importer de Spotify"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => {
              setTab(key);
              setError(null);
            }}
            className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition ${
              tab === key
                ? "bg-gold text-[#161200]"
                : "text-muted hover:text-gold"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "create" ? (
        <form onSubmit={createPlaylist} className="card mt-4 space-y-5 p-6">
          <div>
            <label htmlFor="name" className="mb-1.5 block text-sm font-medium">
              Nom de la playlist
            </label>
            <input
              id="name"
              className="input"
              placeholder="Sessions nocturnes…"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              autoFocus
              required
            />
          </div>
          <div>
            <label htmlFor="desc" className="mb-1.5 block text-sm font-medium">
              Description <span className="text-muted">(optionnel)</span>
            </label>
            <textarea
              id="desc"
              className="input resize-none"
              rows={3}
              placeholder="L'ambiance, l'histoire derrière…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={300}
            />
          </div>
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="h-4 w-4 accent-gold"
            />
            <span className="text-sm">
              Playlist publique <span className="text-muted">(visible dans Découvrir)</span>
            </span>
          </label>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
            {loading ? "Création…" : "Créer la playlist"}
          </button>
          <p className="text-center text-xs text-muted">
            Tu ajouteras les morceaux juste après, via la recherche Spotify ou un lien.
          </p>
        </form>
      ) : (
        <form onSubmit={importPlaylist} className="card mt-4 space-y-5 p-6">
          <div>
            <label htmlFor="url" className="mb-1.5 block text-sm font-medium">
              Lien de la playlist Spotify
            </label>
            <input
              id="url"
              className="input"
              placeholder="https://open.spotify.com/playlist/…"
              value={importUrl}
              onChange={(e) => setImportUrl(e.target.value)}
              autoFocus
              required
            />
            <p className="mt-1.5 text-xs text-muted">
              Dans Spotify : clic droit sur la playlist → Partager → Copier le lien.
            </p>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
            {loading ? "Import en cours…" : "Importer la playlist"}
          </button>
        </form>
      )}
    </div>
  );
}

export default function NewPlaylistPage() {
  return (
    <Suspense>
      <NewPlaylistForm />
    </Suspense>
  );
}
