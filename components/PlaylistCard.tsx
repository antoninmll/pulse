import Link from "next/link";
import PlaylistCover from "./PlaylistCover";
import { IconLock } from "./icons";

export type PlaylistCardData = {
  shareId: string;
  name: string;
  description: string;
  coverUrl: string | null;
  /** JSON array des pochettes des morceaux (pour la cover auto) */
  artsJson?: string | null;
  trackCount: number;
  playCount: number;
  ownerName?: string | null;
  isPublic?: number;
};

export function parseArts(artsJson: string | null | undefined): string[] {
  try {
    const arr = JSON.parse(artsJson || "[]");
    return Array.isArray(arr) ? arr.filter((a): a is string => typeof a === "string") : [];
  } catch {
    return [];
  }
}

export default function PlaylistCard({ playlist }: { playlist: PlaylistCardData }) {
  return (
    <Link href={`/p/${playlist.shareId}`} className="card card-hover block overflow-hidden">
      <div className="relative aspect-square w-full overflow-hidden bg-white/[0.03]">
        <PlaylistCover
          coverUrl={playlist.coverUrl}
          arts={parseArts(playlist.artsJson)}
          seedKey={playlist.shareId}
        />
        {playlist.isPublic === 0 && (
          <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-black/70 px-2 py-1 text-[10px] font-medium text-muted backdrop-blur">
            <IconLock size={11} />
            Privée
          </span>
        )}
      </div>
      <div className="p-4">
        <h3 className="truncate font-display font-semibold">{playlist.name}</h3>
        {playlist.ownerName && (
          <p className="mt-0.5 truncate text-xs text-muted">par @{playlist.ownerName}</p>
        )}
        <p className="mt-1.5 text-xs text-muted">
          {playlist.trackCount} morceau{playlist.trackCount > 1 ? "x" : ""} ·{" "}
          {playlist.playCount} écoute{playlist.playCount > 1 ? "s" : ""}
        </p>
      </div>
    </Link>
  );
}
