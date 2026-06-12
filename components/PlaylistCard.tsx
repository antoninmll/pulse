import Link from "next/link";
import { IconLock, IconMusic } from "./icons";

export type PlaylistCardData = {
  shareId: string;
  name: string;
  description: string;
  coverUrl: string | null;
  trackCount: number;
  playCount: number;
  ownerName?: string | null;
  isPublic?: number;
};

export default function PlaylistCard({ playlist }: { playlist: PlaylistCardData }) {
  return (
    <Link href={`/p/${playlist.shareId}`} className="card card-hover block overflow-hidden">
      <div className="relative aspect-square w-full overflow-hidden bg-white/[0.03]">
        {playlist.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={playlist.coverUrl}
            alt=""
            className="h-full w-full object-cover transition duration-300 hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-gold/40">
            <IconMusic size={42} strokeWidth={1.3} />
          </div>
        )}
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
