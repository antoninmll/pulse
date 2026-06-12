import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  IconArrowLeft,
  IconMusic,
  IconPlay,
  IconTrophy,
  IconUsers,
} from "@/components/icons";
import { db, type PlaylistRow } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

type TrackStat = {
  id: number;
  name: string;
  artists: string;
  albumArt: string | null;
  plays: number;
  listeners: number;
};

function DayChart({ days }: { days: { day: string; plays: number }[] }) {
  // Série complète des 14 derniers jours (les jours sans écoute comptent 0)
  const series: { label: string; plays: number }[] = [];
  const byDay = new Map(days.map((d) => [d.day, d.plays]));
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    series.push({
      label: d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }),
      plays: byDay.get(key) ?? 0,
    });
  }

  const W = 700;
  const H = 180;
  const PAD = 8;
  const max = Math.max(1, ...series.map((s) => s.plays));
  const step = (W - PAD * 2) / (series.length - 1);
  const y = (v: number) => H - PAD - (v / max) * (H - PAD * 2);
  const points = series.map((s, i) => `${PAD + i * step},${y(s.plays)}`).join(" ");
  const area = `${PAD},${H - PAD} ${points} ${W - PAD},${H - PAD}`;

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Écoutes par jour">
        <defs>
          <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e3b341" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#e3b341" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={area} fill="url(#area)" />
        <polyline
          points={points}
          fill="none"
          stroke="#e3b341"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {series.map((s, i) => (
          <circle
            key={i}
            cx={PAD + i * step}
            cy={y(s.plays)}
            r={s.plays > 0 ? 3.5 : 0}
            fill="#e3b341"
          />
        ))}
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-muted">
        <span>{series[0].label}</span>
        <span>{series[6].label}</span>
        <span>{series[13].label}</span>
      </div>
    </div>
  );
}

export default async function StatsPage({ params }: { params: Promise<{ shareId: string }> }) {
  const { shareId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/api/auth/login");

  const playlist = db
    .prepare("SELECT * FROM playlists WHERE share_id = ?")
    .get(shareId) as PlaylistRow | undefined;
  if (!playlist || playlist.owner_id !== user.id) notFound();

  const totals = db
    .prepare(
      "SELECT COUNT(*) AS plays, COUNT(DISTINCT user_id) AS listeners FROM plays WHERE playlist_id = ?"
    )
    .get(playlist.id) as { plays: number; listeners: number };

  const perTrack = db
    .prepare(
      `SELECT t.id, t.name, t.artists, t.album_art AS albumArt,
              COUNT(pl.id) AS plays, COUNT(DISTINCT pl.user_id) AS listeners
       FROM playlist_tracks pt
       JOIN tracks t ON t.id = pt.track_id
       LEFT JOIN plays pl ON pl.track_id = pt.track_id AND pl.playlist_id = pt.playlist_id
       WHERE pt.playlist_id = ?
       GROUP BY t.id ORDER BY plays DESC, pt.position`
    )
    .all(playlist.id) as TrackStat[];

  const perDay = db
    .prepare(
      `SELECT date(played_at, 'unixepoch') AS day, COUNT(*) AS plays
       FROM plays WHERE playlist_id = ? AND played_at >= strftime('%s','now','-13 days','start of day')
       GROUP BY day ORDER BY day`
    )
    .all(playlist.id) as { day: string; plays: number }[];

  const topTrack = perTrack[0]?.plays > 0 ? perTrack[0] : null;
  const maxPlays = Math.max(1, ...perTrack.map((t) => t.plays));

  const cards = [
    { label: "Écoutes totales", value: totals.plays, Icon: IconPlay },
    { label: "Auditeurs uniques", value: totals.listeners, Icon: IconUsers },
    { label: "Morceaux", value: perTrack.length, Icon: IconMusic },
  ];

  return (
    <div>
      <Link
        href={`/p/${playlist.share_id}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-gold"
      >
        <IconArrowLeft size={15} />
        Retour à la playlist
      </Link>
      <p className="eyebrow mt-4">Tableau de bord</p>
      <h1 className="font-display mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
        Stats — <span className="gold-text">{playlist.name}</span>
      </h1>

      {/* Cartes de synthèse */}
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="card p-6">
            <p className="flex items-center gap-2 text-sm text-muted">
              <span className="text-gold">
                <c.Icon size={16} />
              </span>
              {c.label}
            </p>
            <p className="font-display mt-2 text-4xl font-semibold tabular-nums">{c.value}</p>
          </div>
        ))}
      </div>

      {topTrack && (
        <div className="card mt-4 flex items-center gap-4 border-gold/30 p-5">
          {topTrack.albumArt ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={topTrack.albumArt} alt="" className="h-14 w-14 rounded-lg object-cover" />
          ) : (
            <div className="h-14 w-14 rounded-lg bg-white/10" />
          )}
          <div className="min-w-0">
            <p className="eyebrow flex items-center gap-1.5">
              <IconTrophy size={13} />
              Morceau le plus écouté
            </p>
            <p className="mt-1 truncate font-display font-semibold">{topTrack.name}</p>
            <p className="truncate text-sm text-muted">
              {topTrack.artists} — {topTrack.plays} écoute{topTrack.plays > 1 ? "s" : ""}
            </p>
          </div>
        </div>
      )}

      {/* Courbe sur 14 jours */}
      <div className="card mt-4 p-6">
        <h2 className="font-display font-semibold">Écoutes des 14 derniers jours</h2>
        <div className="mt-4">
          {totals.plays === 0 ? (
            <p className="py-8 text-center text-sm text-muted">
              Pas encore d&apos;écoutes — partage le lien de ta playlist pour les voir arriver ici.
            </p>
          ) : (
            <DayChart days={perDay} />
          )}
        </div>
      </div>

      {/* Classement par morceau */}
      <div className="card mt-4 overflow-hidden">
        <h2 className="font-display border-b border-white/5 px-6 py-4 font-semibold">
          Écoutes par morceau
        </h2>
        {perTrack.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-muted">
            Aucun morceau dans la playlist.
          </p>
        ) : (
          <ul>
            {perTrack.map((t, i) => (
              <li
                key={t.id}
                className="flex items-center gap-4 border-b border-white/5 px-6 py-3 last:border-0"
              >
                <span className="w-6 text-right text-sm tabular-nums text-muted">{i + 1}</span>
                {t.albumArt ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={t.albumArt} alt="" className="h-10 w-10 rounded-md object-cover" />
                ) : (
                  <div className="h-10 w-10 rounded-md bg-white/10" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{t.name}</p>
                  <p className="truncate text-xs text-muted">{t.artists}</p>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                    <div
                      className="h-full rounded-full bg-gold"
                      style={{ width: `${(t.plays / maxPlays) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold tabular-nums">{t.plays}</p>
                  <p className="text-[10px] text-muted">
                    {t.listeners} auditeur{t.listeners > 1 ? "s" : ""}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
