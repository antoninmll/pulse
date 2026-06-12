"use client";

import { useEffect, useRef, useState } from "react";
import type { TrackData } from "./PlaylistView";
import { IconLink, IconSearch } from "./icons";

type SearchResult = {
  spotifyId: string;
  name: string;
  artists: string;
  album: string;
  albumArt: string | null;
  durationMs: number;
};

export default function SearchAdd({
  playlistId,
  onAdded,
}: {
  playlistId: number;
  onAdded: (track: TrackData) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [link, setLink] = useState("");
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Recherche avec debounce pendant la frappe
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setResults(res.ok ? data.tracks : []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  async function addTrack(spotifyId: string) {
    setAddingId(spotifyId);
    setMessage(null);
    const res = await fetch(`/api/playlists/${playlistId}/tracks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ spotifyTrackId: spotifyId }),
    });
    const data = await res.json().catch(() => ({}));
    setAddingId(null);
    if (res.ok) {
      const t = data.track;
      onAdded({
        id: t.id,
        spotifyId: t.spotifyId,
        name: t.name,
        artists: t.artists,
        album: t.album,
        albumArt: t.albumArt,
        durationMs: t.durationMs,
      });
      setMessage({ type: "ok", text: `« ${t.name} » ajouté ✓` });
    } else {
      setMessage({ type: "error", text: data.error ?? "Ajout impossible" });
    }
  }

  async function addByLink(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    const res = await fetch(`/api/resolve-link?url=${encodeURIComponent(link)}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage({ type: "error", text: data.error ?? "Lien non reconnu" });
      return;
    }
    if (data.type === "playlist") {
      setMessage({
        type: "error",
        text: "C'est un lien de playlist — utilise « Importer de Spotify » depuis la page Créer.",
      });
      return;
    }
    await addTrack(data.track.spotifyId);
    setLink("");
  }

  return (
    <div className="card mt-8 p-5">
      <h2 className="font-display text-lg font-semibold">Ajouter des morceaux</h2>

      <div className="relative mt-3">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted">
          <IconSearch size={16} />
        </span>
        <input
          className="input input-prefixed"
          placeholder="Rechercher un titre, un artiste sur Spotify…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {searching && <p className="mt-3 text-sm text-muted">Recherche…</p>}

      {results.length > 0 && (
        <ul className="mt-3 max-h-80 overflow-y-auto rounded-xl border border-white/5">
          {results.map((r) => (
            <li
              key={r.spotifyId}
              className="flex items-center gap-3 border-b border-white/5 px-3 py-2.5 last:border-0 hover:bg-white/5"
            >
              {r.albumArt ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={r.albumArt} alt="" className="h-9 w-9 rounded object-cover" />
              ) : (
                <div className="h-9 w-9 rounded bg-white/10" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{r.name}</p>
                <p className="truncate text-xs text-muted">
                  {r.artists} · {r.album}
                </p>
              </div>
              <button
                onClick={() => addTrack(r.spotifyId)}
                disabled={addingId === r.spotifyId}
                className="shrink-0 rounded-full border border-gold/40 px-3 py-1 text-xs font-medium text-gold transition hover:bg-gold/10 disabled:opacity-50"
              >
                {addingId === r.spotifyId ? "…" : "Ajouter"}
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={addByLink} className="mt-4 flex gap-2">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted">
            <IconLink size={16} />
          </span>
          <input
            className="input input-prefixed"
            placeholder="Tu ne trouves pas ? Colle un lien Spotify…"
            value={link}
            onChange={(e) => setLink(e.target.value)}
          />
        </div>
        <button type="submit" disabled={!link.trim()} className="btn-ghost shrink-0 text-sm">
          Ajouter
        </button>
      </form>

      {message && (
        <p
          className={`mt-3 text-sm ${message.type === "ok" ? "text-gold" : "text-red-400"}`}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
