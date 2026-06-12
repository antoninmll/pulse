"use client";

import { useState, useEffect, useRef } from "react";
import { usePlayer } from "./PlayerProvider";
import { useSettings } from "./SettingsProvider";
import Visualizer from "./Visualizer";
import {
  IconNext,
  IconPause,
  IconPlay,
  IconPlus,
  IconPrev,
  IconRepeat,
  IconRepeatOne,
  IconShuffle,
  IconVolume,
  IconMusic,
} from "./icons";

function fmt(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export default function PlayerBar() {
  const {
    current,
    paused,
    positionMs,
    togglePlay,
    next,
    prev,
    seek,
    volume,
    setVolume,
    repeatMode,
    cycleRepeat,
    shuffle,
    toggleShuffle,
    error,
  } = usePlayer();
  const { settings } = useSettings();

  const [showDropdown, setShowDropdown] = useState(false);
  const [playlists, setPlaylists] = useState<{ id: number; name: string }[] | null>(null);
  const [addingStatus, setAddingStatus] = useState<Record<string, "idle" | "loading" | "done" | "error">>({});
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const currentTrackSpotifyId = current?.uri ? current.uri.split(":").pop() : null;

  useEffect(() => {
    setShowDropdown(false);
    setAddingStatus({});
  }, [currentTrackSpotifyId]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function loadPlaylists() {
    try {
      const res = await fetch("/api/playlists");
      const data = await res.json();
      if (res.ok) {
        setPlaylists(data.playlists ?? []);
      }
    } catch {}
  }

  async function addTrackToPlaylist(playlistId: number) {
    if (!currentTrackSpotifyId) return;
    setAddingStatus((s) => ({ ...s, [playlistId]: "loading" }));
    try {
      const res = await fetch(`/api/playlists/${playlistId}/tracks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spotifyTrackId: currentTrackSpotifyId }),
      });
      const data = await res.json();
      if (res.ok) {
        setAddingStatus((s) => ({ ...s, [playlistId]: "done" }));
        setShowDropdown(false);
        alert("Morceau ajouté avec succès !");
      } else {
        setAddingStatus((s) => ({ ...s, [playlistId]: "error" }));
        alert(data.error ?? "Erreur lors de l'ajout");
      }
    } catch {
      setAddingStatus((s) => ({ ...s, [playlistId]: "error" }));
      alert("Erreur lors de l'ajout");
    }
  }

  if (error) {
    return (
      <div className="fixed bottom-4 left-1/2 z-50 w-[min(680px,92vw)] -translate-x-1/2">
        <div className="card border-red-400/40 bg-[#0a0a0b] px-5 py-3 text-sm text-red-300">
          {error}
        </div>
      </div>
    );
  }

  if (!current) return null;

  const repeatLabel =
    repeatMode === "off"
      ? "Répéter : désactivé"
      : repeatMode === "context"
        ? "Répéter : playlist en boucle"
        : "Répéter : titre en boucle";

  return (
    <div className="fixed bottom-4 left-1/2 z-50 w-[min(880px,94vw)] -translate-x-1/2">
      {/* Dropdown de playlists */}
      {showDropdown && currentTrackSpotifyId && (
        <div
          ref={dropdownRef}
          className="absolute bottom-full mb-2 left-4 z-50 w-48 rounded-lg border border-white/10 bg-[#0c0c0d]/98 shadow-[0_10px_30px_rgba(0,0,0,0.8)] p-1.5 space-y-1 animate-fade-in max-h-52 overflow-y-auto"
        >
          {playlists === null ? (
            <p className="py-2 text-center text-[10px] text-muted font-medium">Chargement...</p>
          ) : playlists.length === 0 ? (
            <div className="py-3 text-center px-2">
              <p className="text-[10px] text-muted mb-1.5 font-medium">Aucune playlist</p>
              <a
                href="/new"
                onClick={() => {
                  setShowDropdown(false);
                }}
                className="text-[10px] font-semibold text-gold hover:underline"
              >
                Créer une playlist
              </a>
            </div>
          ) : (
            <>
              <p className="px-2 py-1 text-[9px] font-semibold text-muted uppercase tracking-wider border-b border-white/5 mb-1">
                Ajouter à :
              </p>
              {playlists.map((p) => (
                <button
                  key={p.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    addTrackToPlaylist(p.id);
                  }}
                  disabled={addingStatus[p.id] === "loading"}
                  className="w-full text-left rounded px-2 py-1.5 text-xs text-muted hover:bg-white/5 hover:text-foreground transition flex items-center justify-between disabled:opacity-50"
                >
                  <span className="truncate">{p.name}</span>
                  {addingStatus[p.id] === "loading" && (
                    <span className="text-[10px] text-gold animate-pulse">...</span>
                  )}
                </button>
              ))}
            </>
          )}
        </div>
      )}

      <div className="card relative flex items-center gap-4 overflow-hidden bg-[#0c0c0d]/95 px-4 py-3 shadow-[0_18px_60px_-18px_rgba(0,0,0,0.9)] backdrop-blur-xl">
        {settings.visualizer && (
          <>
            <div className={`pointer-events-none absolute inset-0 h-full w-full overflow-hidden z-0 transition-opacity duration-500 ${
              paused ? "opacity-0" : "opacity-15"
            }`}>
              <Visualizer playing={!paused} theme={settings.theme} />
            </div>
            <div className="pointer-events-none absolute inset-0 bg-black/40 z-0" />
          </>
        )}

        <div className="relative h-12 w-12 shrink-0 rounded-md overflow-hidden group z-10">
          {current.albumArt ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={current.albumArt}
              alt=""
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="h-full w-full bg-white/10 flex items-center justify-center">
              <IconMusic size={16} className="text-muted" />
            </div>
          )}
          {/* Hover Overlay with Plus Button */}
          <button
            ref={buttonRef}
            onClick={(e) => {
              e.stopPropagation();
              setShowDropdown((prev) => !prev);
              if (!showDropdown && playlists === null) {
                loadPlaylists();
              }
            }}
            className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-gold"
            title="Ajouter à une playlist"
          >
            <IconPlus size={16} strokeWidth={2.2} />
          </button>
        </div>

        <div className="relative z-10 min-w-0 flex-1">
          <div className="flex items-center">
            <span className={`player-eq shrink-0 ${paused ? "is-paused" : ""}`}>
              <span />
              <span />
              <span />
            </span>
            <p className="truncate text-sm font-semibold">{current.name}</p>
          </div>
          <p className="truncate text-xs text-muted">{current.artists}</p>
          <div className="mt-1 flex items-center gap-2">
            <span className="w-9 text-right text-[10px] tabular-nums text-muted">
              {fmt(positionMs)}
            </span>
            <input
              type="range"
              min={0}
              max={current.durationMs}
              value={Math.min(positionMs, current.durationMs)}
              onChange={(e) => seek(Number(e.target.value))}
              className="h-1 flex-1 cursor-pointer"
              aria-label="Position"
            />
            <span className="w-9 text-[10px] tabular-nums text-muted">
              {fmt(current.durationMs)}
            </span>
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-1">
          <button
            onClick={toggleShuffle}
            className={`hidden rounded-full p-2 transition sm:block ${
              shuffle ? "text-gold" : "text-muted hover:text-foreground"
            }`}
            aria-label={shuffle ? "Désactiver la lecture aléatoire" : "Lecture aléatoire"}
            title={shuffle ? "Lecture aléatoire activée" : "Lecture aléatoire"}
          >
            <IconShuffle size={16} />
          </button>
          <button
            onClick={prev}
            className="rounded-full p-2 text-muted transition hover:text-foreground"
            aria-label="Précédent"
          >
            <IconPrev size={18} />
          </button>
          <button
            onClick={togglePlay}
            className="rounded-full bg-gold p-3 text-[var(--on-gold)] transition hover:brightness-110"
            aria-label={paused ? "Lecture" : "Pause"}
          >
            {paused ? <IconPlay size={18} /> : <IconPause size={18} />}
          </button>
          <button
            onClick={next}
            className="rounded-full p-2 text-muted transition hover:text-foreground"
            aria-label="Suivant"
          >
            <IconNext size={18} />
          </button>
          <button
            onClick={cycleRepeat}
            className={`hidden rounded-full p-2 transition sm:block ${
              repeatMode !== "off" ? "text-gold" : "text-muted hover:text-foreground"
            }`}
            aria-label={repeatLabel}
            title={repeatLabel}
          >
            {repeatMode === "track" ? <IconRepeatOne size={16} /> : <IconRepeat size={16} />}
          </button>
        </div>

        <div className="relative z-10 hidden items-center gap-1.5 md:flex">
          <span className="text-muted">
            <IconVolume size={15} />
          </span>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(volume * 100)}
            onChange={(e) => setVolume(Number(e.target.value) / 100)}
            className="h-1 w-20 cursor-pointer"
            aria-label="Volume"
          />
        </div>
      </div>
    </div>
  );
}
