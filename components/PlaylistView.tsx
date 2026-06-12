"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { usePlayer } from "./PlayerProvider";
import SearchAdd from "./SearchAdd";
import {
  IconChart,
  IconCheck,
  IconClose,
  IconGlobe,
  IconLock,
  IconMusic,
  IconPlay,
  IconShare,
} from "./icons";

export type PlaylistData = {
  id: number;
  shareId: string;
  name: string;
  description: string;
  coverUrl: string | null;
  isPublic: boolean;
  ownerUsername: string | null;
  plays: number;
  listeners: number;
};

export type TrackData = {
  id: number;
  spotifyId: string;
  name: string;
  artists: string;
  album: string | null;
  albumArt: string | null;
  durationMs: number;
};

function fmtDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export default function PlaylistView({
  playlist,
  initialTracks,
  isOwner,
  isLoggedIn,
}: {
  playlist: PlaylistData;
  initialTracks: TrackData[];
  isOwner: boolean;
  isLoggedIn: boolean;
}) {
  const router = useRouter();
  const player = usePlayer();
  const [tracks, setTracks] = useState(initialTracks);
  const [editing, setEditing] = useState(false);
  const [isPublic, setIsPublic] = useState(playlist.isPublic);
  const [copied, setCopied] = useState(false);

  const uris = tracks.map((t) => `spotify:track:${t.spotifyId}`);
  const totalMs = tracks.reduce((acc, t) => acc + t.durationMs, 0);
  const totalMin = Math.round(totalMs / 60000);

  const isActive = (t: TrackData) =>
    player.activePlaylistId === playlist.id &&
    player.current?.uri === `spotify:track:${t.spotifyId}`;

  function play(index: number) {
    if (!isLoggedIn) {
      window.location.href = "/api/auth/login";
      return;
    }
    player.playContext(playlist.id, uris, index);
  }

  async function share() {
    const url = `${window.location.origin}/p/${playlist.shareId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      prompt("Copie ce lien :", url);
    }
  }

  async function removeTrack(trackId: number) {
    const res = await fetch(`/api/playlists/${playlist.id}/tracks?trackId=${trackId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setTracks((ts) => ts.filter((t) => t.id !== trackId));
      router.refresh();
    }
  }

  async function togglePublic() {
    const next = !isPublic;
    setIsPublic(next);
    await fetch(`/api/playlists/${playlist.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublic: next }),
    });
    router.refresh();
  }

  async function deletePlaylist() {
    if (!confirm(`Supprimer définitivement « ${playlist.name} » ?`)) return;
    const res = await fetch(`/api/playlists/${playlist.id}`, { method: "DELETE" });
    if (res.ok) router.push("/");
  }

  return (
    <div>
      {/* ── En-tête ─────────────────────────────────── */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end">
        <div className="card h-44 w-44 shrink-0 overflow-hidden sm:h-52 sm:w-52">
          {playlist.coverUrl || tracks[0]?.albumArt ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={playlist.coverUrl ?? tracks[0].albumArt!}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-white/[0.03] text-gold/40">
              <IconMusic size={52} strokeWidth={1.2} />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="eyebrow flex items-center gap-1.5">
            {isPublic ? <IconGlobe size={12} /> : <IconLock size={12} />}
            Playlist {isPublic ? "publique" : "privée"}
          </p>
          <h1 className="font-display mt-2 break-words text-3xl font-semibold tracking-tight sm:text-5xl">
            {playlist.name}
          </h1>
          {playlist.description && (
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
              {playlist.description}
            </p>
          )}
          <p className="mt-3 text-sm text-muted">
            {playlist.ownerUsername && (
              <>
                par{" "}
                <Link
                  href={`/u/${playlist.ownerUsername}`}
                  className="text-gold hover:underline"
                >
                  @{playlist.ownerUsername}
                </Link>{" "}
                ·{" "}
              </>
            )}
            {tracks.length} morceau{tracks.length > 1 ? "x" : ""} · {totalMin} min ·{" "}
            {playlist.plays} écoute{playlist.plays > 1 ? "s" : ""} · {playlist.listeners}{" "}
            auditeur{playlist.listeners > 1 ? "s" : ""}
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <button
              onClick={() => play(0)}
              disabled={tracks.length === 0}
              className="btn-primary text-sm"
            >
              <IconPlay size={16} />
              Lecture
            </button>
            <button onClick={share} className="btn-ghost text-sm">
              {copied ? <IconCheck size={16} /> : <IconShare size={16} />}
              {copied ? "Lien copié" : "Partager"}
            </button>
            {isOwner && (
              <>
                <Link href={`/p/${playlist.shareId}/stats`} className="btn-ghost text-sm">
                  <IconChart size={16} />
                  Stats
                </Link>
                <button
                  onClick={() => setEditing((e) => !e)}
                  className={`btn-ghost text-sm ${editing ? "border-gold/55 text-gold" : ""}`}
                >
                  {editing ? "Terminer" : "Modifier"}
                </button>
              </>
            )}
          </div>

          {isOwner && editing && (
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={togglePublic} className="btn-ghost text-xs">
                {isPublic ? <IconLock size={14} /> : <IconGlobe size={14} />}
                {isPublic ? "Rendre privée" : "Rendre publique"}
              </button>
              <button
                onClick={deletePlaylist}
                className="btn-ghost border-red-500/40 text-xs text-red-300 hover:border-red-500/60 hover:text-red-200"
              >
                Supprimer la playlist
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Ajout de morceaux (propriétaire) ─────────── */}
      {isOwner && (editing || tracks.length === 0) && (
        <SearchAdd
          playlistId={playlist.id}
          onAdded={(track) => {
            setTracks((ts) => [...ts, track]);
            router.refresh();
          }}
        />
      )}

      {/* ── Liste des morceaux ───────────────────────── */}
      <div className="card mt-8 overflow-hidden">
        {tracks.length === 0 ? (
          <div className="px-6 py-14 text-center text-sm text-muted">
            Cette playlist est vide
            {isOwner ? " — ajoute des morceaux avec la recherche ci-dessus." : "."}
          </div>
        ) : (
          <ul>
            {tracks.map((t, i) => (
              <li
                key={t.id}
                className={`group flex items-center gap-4 border-b border-white/5 px-4 py-3 transition last:border-0 hover:bg-white/[0.03] ${
                  isActive(t) ? "bg-gold/[0.06]" : ""
                }`}
              >
                <button
                  onClick={() => play(i)}
                  className="flex w-8 shrink-0 items-center justify-center text-sm text-muted"
                  aria-label={`Lire ${t.name}`}
                >
                  {isActive(t) && !player.paused ? (
                    <span className="eq">
                      <span />
                      <span />
                      <span />
                    </span>
                  ) : (
                    <>
                      <span className="group-hover:hidden">{i + 1}</span>
                      <span className="hidden text-gold group-hover:block">
                        <IconPlay size={15} />
                      </span>
                    </>
                  )}
                </button>

                {t.albumArt ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={t.albumArt} alt="" className="h-10 w-10 rounded-md object-cover" />
                ) : (
                  <div className="h-10 w-10 rounded-md bg-white/10" />
                )}

                <button onClick={() => play(i)} className="min-w-0 flex-1 text-left">
                  <p
                    className={`truncate text-sm font-medium ${isActive(t) ? "text-gold" : ""}`}
                  >
                    {t.name}
                  </p>
                  <p className="truncate text-xs text-muted">{t.artists}</p>
                </button>

                <span className="hidden max-w-40 truncate text-xs text-muted md:block">
                  {t.album}
                </span>
                <span className="text-xs tabular-nums text-muted">
                  {fmtDuration(t.durationMs)}
                </span>

                {isOwner && editing && (
                  <button
                    onClick={() => removeTrack(t.id)}
                    className="rounded-full p-1.5 text-muted opacity-0 transition hover:bg-red-500/15 hover:text-red-300 group-hover:opacity-100"
                    aria-label="Retirer ce morceau"
                  >
                    <IconClose size={16} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {!isLoggedIn && tracks.length > 0 && (
        <p className="mt-4 text-center text-sm text-muted">
          <a href="/api/auth/login" className="text-gold hover:underline">
            Connecte-toi avec Spotify
          </a>{" "}
          pour écouter cette playlist en intégral.
        </p>
      )}
    </div>
  );
}
