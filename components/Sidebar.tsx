"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import PlaylistCover from "./PlaylistCover";
import { parseArts } from "./PlaylistCard";
import { IconPlus, IconMusic } from "./icons";

type SidebarPlaylist = {
  shareId: string;
  name: string;
  coverUrl: string | null;
  artsJson?: string | null;
};

export default function Sidebar({
  playlists,
  totalCount,
}: {
  playlists: SidebarPlaylist[];
  totalCount: number;
}) {
  const pathname = usePathname();
  const isFiltered = totalCount > 10;

  return (
    <div className="card flex flex-col gap-4 p-4 sticky top-24 bg-[#0a0a0b]/60 backdrop-blur-md max-h-[calc(100vh-10rem)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2 text-foreground/90">
          <IconMusic size={18} className="text-gold" />
          <span className="font-display font-semibold tracking-wide text-sm">Bibliothèque</span>
          <span className="flex h-5 items-center justify-center rounded-full bg-white/5 px-2 text-[10px] font-medium text-muted">
            {totalCount}
          </span>
        </div>
        <Link
          href="/new"
          className="flex h-7 w-7 items-center justify-center rounded-full bg-white/5 text-muted transition hover:bg-gold/15 hover:text-gold"
          title="Créer une playlist"
        >
          <IconPlus size={14} />
        </Link>
      </div>

      <div className="h-px bg-white/5" />

      {/* Playlists List */}
      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 -mr-1">
        {playlists.length === 0 ? (
          <div className="py-8 text-center px-2">
            <p className="text-xs text-muted">Aucune playlist pour le moment.</p>
            <Link
              href="/new"
              className="mt-3 inline-flex text-xs font-semibold text-gold hover:underline"
            >
              Créer ta première playlist
            </Link>
          </div>
        ) : (
          playlists.map((p) => {
            const isActive = pathname === `/p/${p.shareId}`;
            return (
              <Link
                key={p.shareId}
                href={`/p/${p.shareId}`}
                className={`group flex items-center gap-3 rounded-lg p-2 transition-all ${
                  isActive
                    ? "bg-gold/10 border-l-2 border-gold text-foreground pl-1.5"
                    : "hover:bg-white/[0.04] text-muted hover:text-foreground"
                }`}
              >
                <div className="h-9 w-9 shrink-0 overflow-hidden rounded bg-white/[0.03] transition group-hover:scale-105">
                  <PlaylistCover
                    coverUrl={p.coverUrl}
                    arts={parseArts(p.artsJson)}
                    seedKey={p.shareId}
                    iconSize={14}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium leading-normal transition-colors group-hover:text-foreground">
                    {p.name}
                  </p>
                  <p className="truncate text-[10px] text-muted/80">
                    Playlist
                  </p>
                </div>
              </Link>
            );
          })
        )}
      </div>

      {/* Filter Info */}
      {isFiltered && (
        <div className="pt-2 border-t border-white/5 text-center">
          <p className="text-[10px] text-muted leading-relaxed">
            Dernières écoutées affichées
          </p>
        </div>
      )}
    </div>
  );
}
