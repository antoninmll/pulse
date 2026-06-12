"use client";

import { useState } from "react";
import PlaylistCard, { type PlaylistCardData } from "./PlaylistCard";
import { IconSearch } from "./icons";

export default function MyPlaylistsGrid({ playlists }: { playlists: PlaylistCardData[] }) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const visible = q
    ? playlists.filter(
        (p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
      )
    : playlists;

  return (
    <div>
      <div className="relative mt-8 max-w-sm">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted">
          <IconSearch size={16} />
        </span>
        <input
          className="input input-prefixed"
          placeholder="Rechercher dans mes playlists…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {visible.length === 0 ? (
        <p className="mt-10 text-center text-sm text-muted">
          Aucune playlist ne correspond à « {query} ».
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {visible.map((p) => (
            <PlaylistCard key={p.shareId} playlist={p} />
          ))}
        </div>
      )}
    </div>
  );
}
