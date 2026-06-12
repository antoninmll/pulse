import Link from "next/link";
import { redirect } from "next/navigation";
import MyPlaylistsGrid from "@/components/MyPlaylistsGrid";
import { type PlaylistCardData } from "@/components/PlaylistCard";
import { IconChart, IconImport, IconShare, IconSpotify } from "@/components/icons";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { isConfigured } from "@/lib/spotify";

export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  config:
    "L'application n'est pas encore configurée : renseigne SPOTIFY_CLIENT_ID et SPOTIFY_CLIENT_SECRET dans .env.local (voir README).",
  denied: "Connexion annulée côté Spotify.",
  state: "La connexion a expiré, réessaie.",
  spotify:
    "Spotify a refusé la connexion. Vérifie que ton compte est bien ajouté dans les utilisateurs de l'app Spotify (mode développement).",
};

const FEATURES = [
  {
    icon: IconShare,
    title: "Partage instantané",
    text: "Chaque playlist a son lien unique. Tu l'envoies, c'est tout.",
  },
  {
    icon: IconChart,
    title: "Statistiques en direct",
    text: "Écoutes par morceau, auditeurs uniques, tendance sur 14 jours.",
  },
  {
    icon: IconSpotify,
    title: "Connecté à Spotify",
    text: "Recherche le catalogue, importe tes playlists, écoute en intégral.",
  },
];

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getCurrentUser();
  const { error } = await searchParams;

  if (user && !user.username) redirect("/onboarding");

  if (!user) {
    return (
      <div className="flex flex-col items-center pt-10 text-center sm:pt-20">
        {error && ERRORS[error] && (
          <div className="card mb-8 max-w-xl border-gold/40 px-5 py-3 text-sm text-gold">
            {ERRORS[error]}
          </div>
        )}
        {!isConfigured() && !error && (
          <div className="card mb-8 max-w-xl border-gold/40 px-5 py-3 text-sm text-gold">
            Configuration requise : ajoute tes identifiants Spotify dans{" "}
            <code className="rounded bg-white/10 px-1">.env.local</code> (voir le README).
          </div>
        )}

        <p className="eyebrow">La musique, partagée autrement</p>
        <h1 className="font-display mt-5 max-w-3xl text-5xl font-semibold leading-[1.05] tracking-tight sm:text-7xl">
          Tes playlists, <span className="gold-text">en orbite</span>.
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
          Crée des playlists connectées à Spotify, partage-les d&apos;un lien et découvre en
          temps réel qui les écoute — morceau par morceau.
        </p>

        <a href="/api/auth/login" className="btn-primary mt-10 text-base">
          <IconSpotify size={20} />
          Continuer avec Spotify
        </a>
        <p className="mt-3 text-xs text-muted">
          Aucun compte à créer — ton profil naît de ton compte Spotify.
        </p>

        <div className="mt-20 h-px w-full max-w-4xl hairline" />

        <div className="mt-12 grid w-full max-w-4xl gap-px overflow-hidden rounded-2xl border border-white/5 bg-white/5 sm:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="bg-[#0a0a0b] p-7 text-left">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-gold/30 bg-gold/10 text-gold">
                <f.icon size={20} />
              </span>
              <h3 className="font-display mt-4 font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{f.text}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const myPlaylists = db
    .prepare(
      `SELECT p.share_id AS shareId, p.name, p.description, p.cover_url AS coverUrl, p.is_public AS isPublic,
              (SELECT COUNT(*) FROM playlist_tracks pt WHERE pt.playlist_id = p.id) AS trackCount,
              (SELECT COUNT(*) FROM plays pl WHERE pl.playlist_id = p.id) AS playCount,
              (SELECT json_group_array(album_art) FROM (
                 SELECT t.album_art FROM playlist_tracks pt
                 JOIN tracks t ON t.id = pt.track_id
                 WHERE pt.playlist_id = p.id AND t.album_art IS NOT NULL
                 ORDER BY pt.position LIMIT 12
               )) AS artsJson
       FROM playlists p WHERE p.owner_id = ? ORDER BY p.created_at DESC`
    )
    .all(user.id) as PlaylistCardData[];

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted">
            Salut <span className="gold-text">@{user.username}</span>
          </p>
          <h1 className="font-display mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
            Mes playlists
          </h1>
        </div>
        <div className="flex gap-2">
          <Link href="/new?tab=import" className="btn-ghost text-sm">
            <IconImport size={16} />
            Importer
          </Link>
          <Link href="/new" className="btn-primary text-sm">
            Nouvelle playlist
          </Link>
        </div>
      </div>

      {myPlaylists.length === 0 ? (
        <div className="card mt-10 flex flex-col items-center px-6 py-16 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-gold/30 bg-gold/10 text-gold">
            <IconShare size={22} />
          </span>
          <h2 className="font-display mt-5 text-xl font-semibold">
            Ta première playlist t&apos;attend
          </h2>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">
            Crée une playlist depuis zéro avec la recherche Spotify, ou importe une de tes
            playlists existantes en collant son lien.
          </p>
          <div className="mt-6 flex gap-3">
            <Link href="/new" className="btn-primary text-sm">
              Créer
            </Link>
            <Link href="/new?tab=import" className="btn-ghost text-sm">
              Importer
            </Link>
          </div>
        </div>
      ) : (
        <MyPlaylistsGrid playlists={myPlaylists} />
      )}
    </div>
  );
}
