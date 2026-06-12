"use client";

import { usePlayer } from "./PlayerProvider";
import { IconNext, IconPause, IconPlay, IconPrev } from "./icons";

function fmt(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export default function PlayerBar() {
  const { current, paused, positionMs, togglePlay, next, prev, seek, setVolume, error } =
    usePlayer();

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

  return (
    <div className="fixed bottom-4 left-1/2 z-50 w-[min(880px,94vw)] -translate-x-1/2">
      <div className="card flex items-center gap-4 bg-[#0c0c0d]/95 px-4 py-3 shadow-[0_18px_60px_-18px_rgba(0,0,0,0.9)] backdrop-blur-xl">
        {current.albumArt ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={current.albumArt} alt="" className="h-12 w-12 rounded-md object-cover" />
        ) : (
          <div className="h-12 w-12 rounded-md bg-white/10" />
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {!paused && (
              <span className="eq shrink-0">
                <span />
                <span />
                <span />
              </span>
            )}
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

        <div className="flex items-center gap-1">
          <button
            onClick={prev}
            className="rounded-full p-2 text-muted transition hover:text-foreground"
            aria-label="Précédent"
          >
            <IconPrev size={18} />
          </button>
          <button
            onClick={togglePlay}
            className="rounded-full bg-gold p-3 text-[#161200] transition hover:brightness-110"
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
        </div>

        <input
          type="range"
          min={0}
          max={100}
          defaultValue={70}
          onChange={(e) => setVolume(Number(e.target.value) / 100)}
          className="hidden h-1 w-20 cursor-pointer md:block"
          aria-label="Volume"
        />
      </div>
    </div>
  );
}
