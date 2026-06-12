import { IconMusic } from "./icons";

/**
 * Cover de playlist.
 * - cover_url défini (upload manuel ou import Spotify) → image telle quelle ;
 * - sinon, cover générée : 2 pochettes de la playlist choisies pseudo-aléatoirement
 *   (stables pour un même seed) fusionnées par un fondu en diagonale ;
 * - une seule pochette si la playlist n'a qu'un titre, placeholder si elle est vide.
 */

// PRNG déterministe : la cover ne change pas entre le rendu serveur et client.
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function pickCoverArts(arts: string[], seedKey: string): string[] {
  const unique = [...new Set(arts.filter(Boolean))];
  return unique.slice(0, 2);
}

export default function PlaylistCover({
  coverUrl,
  arts,
  seedKey,
  iconSize = 42,
  className = "",
}: {
  coverUrl: string | null;
  arts: string[];
  seedKey: string;
  iconSize?: number;
  className?: string;
}) {
  if (coverUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={coverUrl} alt="" className={`h-full w-full object-cover ${className}`} />
    );
  }

  const picked = pickCoverArts(arts, seedKey);

  if (picked.length === 0) {
    return (
      <div
        className={`flex h-full w-full items-center justify-center bg-white/[0.03] text-gold/40 ${className}`}
      >
        <IconMusic size={iconSize} strokeWidth={1.3} />
      </div>
    );
  }

  if (picked.length === 1) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={picked[0]} alt="" className={`h-full w-full object-cover ${className}`} />
    );
  }

  return (
    <div className={`relative h-full w-full ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={picked[0]} alt="" className="absolute inset-0 h-full w-full object-cover" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={picked[1]}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        style={{
          maskImage: "linear-gradient(135deg, transparent 38%, black 62%)",
          WebkitMaskImage: "linear-gradient(135deg, transparent 38%, black 62%)",
        }}
      />
    </div>
  );
}
