"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Avatar from "./Avatar";
import HeaderSearch from "./HeaderSearch";
import { IconHome, IconSpotify, IconWave } from "./icons";

type NavUser = {
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
};

export default function Nav({ user }: { user: NavUser | null }) {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-[#0a0a0b]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Left Side: Logo */}
        <div className="flex sm:flex-1 justify-start">
          <Link href="/" className="flex shrink-0 items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-gold/40 bg-gold/10 text-gold">
              <IconWave size={18} />
            </span>
            <span className="hidden font-display text-lg font-semibold tracking-[0.2em] text-foreground sm:inline">
              PULSE
            </span>
          </Link>
        </div>

        {/* Center Side: Search Bar */}
        <div className="flex flex-1 justify-center">
          {user && <HeaderSearch />}
        </div>

        {/* Right Side: Navigation */}
        <div className="flex sm:flex-1 justify-end">
          <nav className="flex shrink-0 items-center gap-1 sm:gap-2">
            {user ? (
              <>
                <Link
                  href="/"
                  className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-sm transition hover:text-gold ${
                    pathname === "/" ? "text-gold" : "text-muted"
                  }`}
                >
                  <IconHome size={15} />
                  <span className="hidden sm:inline">Accueil</span>
                </Link>
                <Link
                  href="/new"
                  className="rounded-full border border-gold/30 px-3.5 py-2 text-sm font-medium text-gold transition hover:bg-gold/10"
                >
                  Créer
                </Link>
                <Link href="/profile" className="ml-1" aria-label="Mon profil">
                  <Avatar
                    src={user.avatarUrl}
                    name={user.username ?? user.displayName ?? "?"}
                    size={36}
                  />
                </Link>
              </>
            ) : (
              <a href="/api/auth/login" className="btn-primary text-sm">
                <IconSpotify size={16} />
                Se connecter
              </a>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
