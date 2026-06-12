"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Avatar from "./Avatar";
import { parseArts } from "./PlaylistCard";
import PlaylistCover from "./PlaylistCover";
import { usePlayer } from "./PlayerProvider";
import { IconPause, IconPlay, IconSearch } from "./icons";

type SearchType = "tracks" | "playlists" | "users";

const TYPE_TABS: [SearchType, string][] = [
  ["tracks", "Musiques"],
  ["playlists", "Playlists"],
  ["users", "Utilisateurs"],
];

type TrackResult = {
  spotifyId: string;
  name: string;
  artists: string;
  album: string;
  albumArt: string | null;
  durationMs: number;
};

type PlaylistResult = {
  shareId: string;
  name: string;
  description: string;
  coverUrl: string | null;
  artsJson: string | null;
  ownerName: string | null;
  trackCount: number;
  playCount: number;
};

type UserResult = {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string;
  playlistCount: number;
};

export default function HeaderSearch() {
  const player = usePlayer();
  const pathname = usePathname();
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [query, setQuery] = useState("");
  const [type, setType] = useState<SearchType>("tracks");
  const [results, setResults] = useState<unknown[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  // Recherche débouncée
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setSearching(false);
      setError(null);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/discover?q=${encodeURIComponent(q)}&type=${type}`);
        const data = await res.json();
        if (res.ok) {
          setResults(data.results ?? []);
          setError(null);
        } else {
          setResults([]);
          setError(data.error ?? "La recherche a échoué");
        }
      } catch {
        setResults([]);
        setError("La recherche a échoué");
      } finally {
        setSearching(false);
      }
    }, 320);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, type]);

  // Fermer au clic extérieur
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // Fermer au changement de page
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  function playTrack(t: TrackResult) {
    player.playContext(null, [`spotify:track:${t.spotifyId}`], 0);
  }

  const isTrackPlaying = (t: TrackResult) =>
    player.current?.uri === `spotify:track:${t.spotifyId}` && !player.paused;

  const showPanel = open && query.trim().length >= 2;

  return (
    <div ref={containerRef} className="relative mx-3 max-w-md flex-1">
      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted">
        <IconSearch size={16} />
      </span>
      <input
        className="input input-prefixed h-10 py-0"
        placeholder="Rechercher un titre, une playlist, un profil…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setOpen(false);
            (e.target as HTMLInputElement).blur();
          }
        }}
      />

      {showPanel && (
        <div className="absolute left-0 right-0 top-12 z-50 overflow-hidden rounded-xl border border-white/10 bg-[#0c0c0d]/98 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.9)] backdrop-blur-xl">
          {/* Onglets de type */}
          <div className="flex gap-1 border-b border-white/5 p-2">
            {TYPE_TABS.map(([key, label]) => (
              <button
                key={key}
                onClick={() => setType(key)}
                className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  type === key ? "bg-gold text-[var(--on-gold)]" : "text-muted hover:text-gold"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {searching && <p className="px-4 py-6 text-center text-sm text-muted">Recherche…</p>}
            {error && !searching && (
              <p className="px-4 py-6 text-center text-sm text-red-400">{error}</p>
            )}
            {!searching && !error && results.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-muted">
                Aucun résultat pour « {query.trim()} ».
              </p>
            )}

            {/* Musiques */}
            {!searching && type === "tracks" && (
              <ul>
                {(results as TrackResult[]).map((t, i) => (
                  <li
                    key={`${t.spotifyId}-${i}`}
                    className="group flex items-center gap-3 border-b border-white/5 px-3 py-2 transition last:border-0 hover:bg-white/[0.04]"
                  >
                    <button
                      onClick={() => playTrack(t)}
                      className="relative shrink-0"
                      aria-label={`Écouter ${t.name}`}
                    >
                      {t.albumArt ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={t.albumArt} alt="" className="h-10 w-10 rounded object-cover" />
                      ) : (
                        <span className="block h-10 w-10 rounded bg-white/10" />
                      )}
                      <span className="absolute inset-0 flex items-center justify-center rounded bg-black/50 text-gold opacity-0 transition group-hover:opacity-100">
                        {isTrackPlaying(t) ? <IconPause size={16} /> : <IconPlay size={16} />}
                      </span>
                    </button>
                    <button
                      onClick={() => playTrack(t)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <p
                        className={`truncate text-sm ${
                          player.current?.uri === `spotify:track:${t.spotifyId}`
                            ? "text-gold"
                            : ""
                        }`}
                      >
                        {t.name}
                      </p>
                      <p className="truncate text-xs text-muted">{t.artists}</p>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {/* Playlists */}
            {!searching && type === "playlists" && (
              <ul>
                {(results as PlaylistResult[]).map((p) => (
                  <li key={p.shareId} className="border-b border-white/5 last:border-0">
                    <Link
                      href={`/p/${p.shareId}`}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 px-3 py-2 transition hover:bg-white/[0.04]"
                    >
                      <span className="h-10 w-10 shrink-0 overflow-hidden rounded">
                        <PlaylistCover
                          coverUrl={p.coverUrl}
                          arts={parseArts(p.artsJson)}
                          seedKey={p.shareId}
                          iconSize={18}
                        />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm">{p.name}</span>
                        <span className="block truncate text-xs text-muted">
                          {p.ownerName ? `par @${p.ownerName} · ` : ""}
                          {p.trackCount} morceau{p.trackCount > 1 ? "x" : ""}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            {/* Utilisateurs */}
            {!searching && type === "users" && (
              <ul>
                {(results as UserResult[]).map((u) => (
                  <li key={u.username} className="border-b border-white/5 last:border-0">
                    <Link
                      href={`/u/${u.username}`}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 px-3 py-2 transition hover:bg-white/[0.04]"
                    >
                      <Avatar src={u.avatarUrl} name={u.username} size={40} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm">
                          {u.displayName ?? u.username}{" "}
                          <span className="text-muted">@{u.username}</span>
                        </span>
                        <span className="block truncate text-xs text-muted">
                          {u.playlistCount} playlist{u.playlistCount > 1 ? "s" : ""}
                          {u.bio ? ` · ${u.bio}` : ""}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {type === "tracks" && !searching && results.length > 0 && (
            <p className="border-t border-white/5 px-4 py-2 text-center text-[11px] text-muted">
              Clique un titre pour l&apos;écouter directement.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
