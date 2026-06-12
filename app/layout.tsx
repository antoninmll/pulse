import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import Nav from "@/components/Nav";
import PlayerBar from "@/components/PlayerBar";
import Sidebar from "@/components/Sidebar";
import { PlayerProvider } from "@/components/PlayerProvider";
import { SettingsProvider } from "@/components/SettingsProvider";
import { db, parseSettings } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import "./globals.css";

const inter = Inter({ variable: "--font-body", subsets: ["latin"] });
const spaceGrotesk = Space_Grotesk({ variable: "--font-display", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Pulse — Partage tes playlists",
  description:
    "Crée, partage et écoute des playlists connectées à Spotify, avec des stats d'écoute en temps réel.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();
  const settings = parseSettings(user?.settings);

  let sidebarPlaylists: any[] = [];
  let totalPlaylists = 0;

  if (user && user.username) {
    const countResult = db
      .prepare("SELECT COUNT(*) as count FROM playlists WHERE owner_id = ?")
      .get(user.id) as { count: number };
    totalPlaylists = countResult?.count || 0;

    if (totalPlaylists > 10) {
      sidebarPlaylists = db
        .prepare(
          `SELECT p.share_id AS shareId, p.name, p.cover_url AS coverUrl,
                  (SELECT json_group_array(album_art) FROM (
                     SELECT t.album_art FROM playlist_tracks pt
                     JOIN tracks t ON t.id = pt.track_id
                     WHERE pt.playlist_id = p.id AND t.album_art IS NOT NULL
                     ORDER BY pt.position LIMIT 12
                   )) AS artsJson,
                  (SELECT MAX(pl.played_at) FROM plays pl WHERE pl.playlist_id = p.id AND pl.user_id = ?) AS lastPlayed
           FROM playlists p
           WHERE p.owner_id = ?
           ORDER BY COALESCE(lastPlayed, 0) DESC, p.created_at DESC
           LIMIT 10`
        )
        .all(user.id, user.id);
    } else {
      sidebarPlaylists = db
        .prepare(
          `SELECT p.share_id AS shareId, p.name, p.cover_url AS coverUrl,
                  (SELECT json_group_array(album_art) FROM (
                     SELECT t.album_art FROM playlist_tracks pt
                     JOIN tracks t ON t.id = pt.track_id
                     WHERE pt.playlist_id = p.id AND t.album_art IS NOT NULL
                     ORDER BY pt.position LIMIT 12
                   )) AS artsJson
           FROM playlists p
           WHERE p.owner_id = ?
           ORDER BY p.created_at DESC`
        )
        .all(user.id);
    }
  }

  return (
    <html
      lang="fr"
      data-theme={settings.theme}
      className={`${inter.variable} ${spaceGrotesk.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <div className="ambient" />
        <SettingsProvider initial={settings}>
          <PlayerProvider enabled={Boolean(user)}>
            <Nav
              user={
                user
                  ? {
                      username: user.username,
                      displayName: user.display_name,
                      avatarUrl: user.avatar_url,
                    }
                  : null
              }
            />
            {user && user.username ? (
              <div className="mx-auto w-full max-w-6xl flex-1 px-4 pb-40 pt-8 sm:px-6 flex flex-col md:flex-row gap-8">
                <aside className="w-full md:w-60 shrink-0 hidden md:block">
                  <Sidebar playlists={sidebarPlaylists} totalCount={totalPlaylists} />
                </aside>
                <main className="flex-1 min-w-0">
                  {children}
                </main>
              </div>
            ) : (
              <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-40 pt-8 sm:px-6">
                {children}
              </main>
            )}
            <PlayerBar />
          </PlayerProvider>
        </SettingsProvider>
      </body>
    </html>
  );
}
