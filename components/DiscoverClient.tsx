"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import Avatar from "./Avatar";
import PlaylistCard, { type PlaylistCardData } from "./PlaylistCard";
import { usePlayer } from "./PlayerProvider";
import { IconPause, IconPlay, IconSearch } from "./icons";

type SearchType = "playlists" | "users" | "tracks";

type UserResult = {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string;
  playlistCount: number;
};

type TrackResult = {
  spotifyId: string;
  name: string;
  artists: string;
  album: string;
  albumArt: string | null;
  durationMs: number;
};

const TYPE_LABELS: [SearchType, string][] = [
  ["playlists", "Playlists"],
  ["users", "Utilisateurs"],
  ["tracks", "Musiques"],
];

function fmtDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export default function DiscoverClient({
  initialPlaylists,
  isLoggedIn,
}: {
  initialPlaylists: PlaylistCardData[];
  isLoggedIn: boolean;
}) {
  const player = usePlayer();
  const [query, setQuery] = useState("");
  const [type, setType] = useState<SearchType>("playlists");
  const [results, setResults] = useState<unknown[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    setError(null);
    if (q.length < 2) {
      setResults(null);
      setSearching(false);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/discover?q=${encodeURIComponent(q)}&type=${type}`
        );
        const data = await res.json();
        if (res.ok) {
          setResults(data.results);
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
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, type]);

  function playTrack(t: TrackResult) {
    if (!isLoggedIn) {
      window.location.href = "/api/auth/login";
      return;
    }
    // Lecture libre : hors playlist, aucune stat enregistrée
    player.playContext(null, [`spotify:track:${t.spotifyId}`], 0);
  }

  const isTrackPlaying = (t: TrackResult) =>
    player.current?.uri === `spotify:track:${t.spotifyId}` && !player.paused;

  const showDefault = results === null;

  return (
    <div>
      {/* ── Barre de recherche ──────────────────────── */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-md">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted">
            <IconSearch size={16} />
          </span>
          <input
            className="input input-prefixed"
            placeholder={
              type === "playlists"
                ? "Rechercher une playlist…"
                : type === "users"
                  ? "Rechercher un utilisateur…"
                  : "Rechercher une musique sur Spotify…"
            }
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="card flex gap-1 p-1">
          {TYPE_LABELS.map(([key, label]) => (
            <button
              key={key}
              onClick={() => setType(key)}
              className={`rounded-lg px-3.5 py-2 text-sm font-medium transition ${
                type === key ? "bg-gold text-[#161200]" : "text-muted hover:text-gold"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {searching && <p className="mt-6 text-sm text-muted">Recherche…</p>}
      {error && <p className="mt-6 text-sm text-red-400">{error}</p>}

      {/* ── Résultats ───────────────────────────────── */}
      {showDefault ? (
        initialPlaylists.length === 0 ? (
          <div className="card mt-10 px-6 py-16 text-center text-muted">
            Aucune playlist publique pour l&apos;instant — sois la première personne à en
            partager une !
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {initialPlaylists.map((p) => (
              <PlaylistCard key={p.shareId} playlist={p} />
            ))}
          </div>
        )
      ) : results!.length === 0 && !searching ? (
        <p className="mt-8 text-center text-sm text-muted">
          Aucun résultat pour « {query.trim()} ».
        </p>
      ) : type === "playlists" ? (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {(results as PlaylistCardData[]).map((p) => (
            <PlaylistCard key={p.shareId} playlist={p} />
          ))}
        </div>
      ) : type === "users" ? (
        <ul className="card mt-8 overflow-hidden">
          {(results as UserResult[]).map((u) => (
            <li key={u.username} className="border-b border-white/5 last:border-0">
              <Link
                href={`/u/${u.username}`}
                className="flex items-center gap-4 px-5 py-3.5 transition hover:bg-white/[0.04]"
              >
                <Avatar src={u.avatarUrl} name={u.username} size={44} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {u.displayName ?? u.username}{" "}
                    <span className="text-muted">@{u.username}</span>
                  </p>
                  {u.bio && <p className="truncate text-xs text-muted">{u.bio}</p>}
                </div>
                <span className="shrink-0 text-xs text-muted">
                  {u.playlistCount} playlist{u.playlistCount > 1 ? "s" : ""}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="card mt-8 overflow-hidden">
          {(results as TrackResult[]).map((t) => (
            <li
              key={t.spotifyId}
              className="group flex items-center gap-4 border-b border-white/5 px-4 py-3 transition last:border-0 hover:bg-white/[0.03]"
            >
              <button
                onClick={() => playTrack(t)}
                className="relative shrink-0"
                aria-label={`Écouter ${t.name}`}
              >
                {t.albumArt ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={t.albumArt} alt="" className="h-11 w-11 rounded-md object-cover" />
                ) : (
                  <span className="block h-11 w-11 rounded-md bg-white/10" />
                )}
                <span className="absolute inset-0 flex items-center justify-center rounded-md bg-black/50 text-gold opacity-0 transition group-hover:opacity-100">
                  {isTrackPlaying(t) ? <IconPause size={18} /> : <IconPlay size={18} />}
                </span>
              </button>
              <button onClick={() => playTrack(t)} className="min-w-0 flex-1 text-left">
                <p
                  className={`truncate text-sm font-medium ${
                    player.current?.uri === `spotify:track:${t.spotifyId}` ? "text-gold" : ""
                  }`}
                >
                  {t.name}
                </p>
                <p className="truncate text-xs text-muted">{t.artists}</p>
              </button>
              <span className="hidden max-w-40 truncate text-xs text-muted md:block">
                {t.album}
              </span>
              <span className="shrink-0 text-xs tabular-nums text-muted">
                {fmtDuration(t.durationMs)}
              </span>
            </li>
          ))}
        </ul>
      )}

      {type === "tracks" && results !== null && results.length > 0 && (
        <p className="mt-3 text-center text-xs text-muted">
          Clique sur un titre pour l&apos;écouter directement — sans l&apos;ajouter à une
          playlist.
        </p>
      )}
    </div>
  );
}
