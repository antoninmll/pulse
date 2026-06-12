import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import Nav from "@/components/Nav";
import PlayerBar from "@/components/PlayerBar";
import { PlayerProvider } from "@/components/PlayerProvider";
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

  return (
    <html lang="fr" className={`${inter.variable} ${spaceGrotesk.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <div className="ambient" />
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
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-40 pt-8 sm:px-6">
            {children}
          </main>
          <PlayerBar />
        </PlayerProvider>
      </body>
    </html>
  );
}
