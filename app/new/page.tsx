"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { IconLink, IconMusic } from "@/components/icons";

type SpotifyPlaylistItem = {
  spotifyId: string;
  name: string;
  coverUrl: string | null;
  trackCount: number | null;
  owner: string | null;
};

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

  // Sélecteur : playlists du compte Spotify
  const [myLists, setMyLists] = useState<SpotifyPlaylistItem[] | null>(null);
  const [listsError, setListsError] = useState<string | null>(null);
  const [importingId, setImportingId] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    if (tab !== "import" || myLists !== null) return;
    fetch("/api/playlists/import")
      .then(async (res) => {
        const data = await res.json();
        if (res.ok) setMyLists(data.playlists);
        else setListsError(data.error ?? "Chargement impossible");
      })
      .catch(() => setListsError("Chargement impossible"));
  }, [tab, myLists]);

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

  async function doImport(payload: { url?: string; spotifyId?: string }) {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/playlists/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      router.push(`/p/${data.shareId}`);
    } else {
      setError(data.error ?? "Import impossible");
      setLoading(false);
      setImportingId(null);
    }
  }

  const visibleLists =
    myLists?.filter((p) => p.name.toLowerCase().includes(filter.trim().toLowerCase())) ?? null;

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
                ? "bg-gold text-[var(--on-gold)]"
                : "text-muted hover:text-gold"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "create" ? (
        <form onSubmit={createPlaylist} className="card mt-4 space-y-5 p-6 animate-fade-in">
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
              Playlist publique{" "}
              <span className="text-muted">(visible dans la recherche)</span>
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
        <div className="card mt-4 space-y-5 p-6 animate-fade-in">
          <div>
            <p className="text-sm font-medium">Tes playlists Spotify</p>
            <p className="mt-1 text-xs text-muted">
              Clique sur une playlist pour l&apos;importer dans Pulse.
            </p>
          </div>

          {listsError && <p className="text-sm text-red-400">{listsError}</p>}

          {myLists === null && !listsError && (
            <p className="py-6 text-center text-sm text-muted">Chargement de tes playlists…</p>
          )}

          {myLists !== null && myLists.length === 0 && (
            <p className="py-6 text-center text-sm text-muted">
              Aucune playlist trouvée sur ton compte Spotify.
            </p>
          )}

          {myLists !== null && myLists.length > 0 && (
            <>
              {myLists.length > 6 && (
                <input
                  className="input"
                  placeholder="Filtrer…"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                />
              )}
              <ul className="max-h-96 overflow-y-auto rounded-xl border border-white/5">
                {visibleLists!.map((p) => (
                  <li key={p.spotifyId} className="border-b border-white/5 last:border-0">
                    <button
                      onClick={() => {
                        setImportingId(p.spotifyId);
                        doImport({ spotifyId: p.spotifyId });
                      }}
                      disabled={loading}
                      className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-white/5 disabled:opacity-60"
                    >
                      {p.coverUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.coverUrl} alt="" className="h-11 w-11 rounded object-cover" />
                      ) : (
                        <span className="flex h-11 w-11 items-center justify-center rounded bg-white/10 text-gold/50">
                          <IconMusic size={18} />
                        </span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm">{p.name}</span>
                        <span className="block truncate text-xs text-muted">
                          {p.trackCount !== null
                            ? `${p.trackCount} morceau${p.trackCount > 1 ? "x" : ""}`
                            : ""}
                          {p.trackCount !== null && p.owner ? " · " : ""}
                          {p.owner ? `par ${p.owner}` : ""}
                        </span>
                      </span>
                      <span className="shrink-0 rounded-full border border-gold/40 px-3 py-1 text-xs font-medium text-gold">
                        {importingId === p.spotifyId && loading ? "Import…" : "Importer"}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              doImport({ url: importUrl });
            }}
            className="space-y-3 border-t border-white/5 pt-5"
          >
            <label htmlFor="url" className="block text-sm font-medium">
              Ou colle un lien de playlist
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted">
                <IconLink size={16} />
              </span>
              <input
                id="url"
                className="input input-prefixed"
                placeholder="https://open.spotify.com/playlist/…"
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
              />
            </div>
            <p className="text-xs text-muted">
              Les playlists générées par Spotify (Daily Mix, Blend, Top 50…) ne sont pas
              importables — Spotify en bloque l&apos;accès aux applications tierces.
            </p>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={loading || !importUrl.trim()}
              className="btn-primary w-full justify-center"
            >
              {loading && !importingId ? "Import en cours…" : "Importer depuis le lien"}
            </button>
          </form>
        </div>
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
