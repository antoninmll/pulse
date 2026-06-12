"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type CurrentTrack = {
  uri: string;
  name: string;
  artists: string;
  albumArt: string | null;
  durationMs: number;
};

type PlayerContextValue = {
  ready: boolean;
  error: string | null;
  current: CurrentTrack | null;
  paused: boolean;
  positionMs: number;
  /** Lance la lecture d'une playlist Pulse à partir d'un index. */
  playContext: (playlistId: number, uris: string[], index: number) => Promise<void>;
  togglePlay: () => void;
  next: () => void;
  prev: () => void;
  seek: (ms: number) => void;
  setVolume: (v: number) => void;
  /** uri du contexte playlist en cours (pour surligner le morceau actif) */
  activePlaylistId: number | null;
};

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer doit être utilisé sous <PlayerProvider>");
  return ctx;
}

async function getToken(): Promise<{ accessToken: string; product: string | null }> {
  const res = await fetch("/api/spotify/token");
  if (!res.ok) throw new Error("TOKEN");
  return res.json();
}

export function PlayerProvider({
  enabled,
  children,
}: {
  enabled: boolean;
  children: ReactNode;
}) {
  const playerRef = useRef<SpotifyPlayer | null>(null);
  const deviceIdRef = useRef<string | null>(null);
  const contextRef = useRef<{ playlistId: number } | null>(null);
  const lastRecordedUriRef = useRef<string | null>(null);

  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState<CurrentTrack | null>(null);
  const [paused, setPaused] = useState(true);
  const [positionMs, setPositionMs] = useState(0);
  const [activePlaylistId, setActivePlaylistId] = useState<number | null>(null);

  const recordPlay = useCallback((uri: string) => {
    const ctx = contextRef.current;
    if (!ctx) return;
    if (lastRecordedUriRef.current === uri) return;
    lastRecordedUriRef.current = uri;
    const spotifyTrackId = uri.split(":").pop();
    fetch("/api/plays", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playlistId: ctx.playlistId, spotifyTrackId }),
    }).catch(() => {});
  }, []);

  // Initialisation du SDK Spotify
  useEffect(() => {
    if (!enabled || playerRef.current) return;

    let cancelled = false;

    const init = () => {
      if (cancelled || !window.Spotify) return;
      const player = new window.Spotify.Player({
        name: "Pulse",
        getOAuthToken: (cb) => {
          getToken()
            .then((d) => cb(d.accessToken))
            .catch(() => setError("Session Spotify expirée — reconnecte-toi."));
        },
        volume: 0.7,
      });

      player.addListener("ready", ({ device_id }) => {
        deviceIdRef.current = device_id;
        setReady(true);
      });
      player.addListener("not_ready", () => setReady(false));
      player.addListener("account_error", () =>
        setError("La lecture nécessite un compte Spotify Premium.")
      );
      player.addListener("authentication_error", () =>
        setError("Authentification Spotify échouée — reconnecte-toi.")
      );
      player.addListener("initialization_error", ({ message }) =>
        setError(`Lecteur indisponible : ${message}`)
      );
      player.addListener("playback_error", ({ message }) =>
        console.warn("Playback error:", message)
      );

      player.addListener("player_state_changed", (state) => {
        if (!state) {
          setCurrent(null);
          setPaused(true);
          return;
        }
        const t = state.track_window.current_track;
        setCurrent({
          uri: t.uri,
          name: t.name,
          artists: t.artists.map((a) => a.name).join(", "),
          albumArt: t.album.images[0]?.url ?? null,
          durationMs: state.duration,
        });
        setPaused(state.paused);
        setPositionMs(state.position);
        if (!state.paused) recordPlay(t.uri);
      });

      player.connect();
      playerRef.current = player;
    };

    if (window.Spotify) {
      init();
    } else {
      window.onSpotifyWebPlaybackSDKReady = init;
      if (!document.getElementById("spotify-sdk")) {
        const script = document.createElement("script");
        script.id = "spotify-sdk";
        script.src = "https://sdk.scdn.co/spotify-player.js";
        script.async = true;
        document.body.appendChild(script);
      }
    }

    return () => {
      cancelled = true;
    };
  }, [enabled, recordPlay]);

  // Progression locale entre deux événements du SDK
  useEffect(() => {
    if (paused || !current) return;
    const interval = setInterval(() => {
      setPositionMs((p) => Math.min(p + 1000, current.durationMs));
    }, 1000);
    return () => clearInterval(interval);
  }, [paused, current]);

  const playContext = useCallback(
    async (playlistId: number, uris: string[], index: number) => {
      setError(null);
      try {
        const { accessToken, product } = await getToken();
        if (product && product !== "premium") {
          setError("La lecture nécessite un compte Spotify Premium.");
          return;
        }
        const deviceId = deviceIdRef.current;
        if (!deviceId) {
          setError("Le lecteur démarre… réessaie dans quelques secondes.");
          return;
        }
        contextRef.current = { playlistId };
        lastRecordedUriRef.current = null;
        setActivePlaylistId(playlistId);

        const res = await fetch(
          `https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`,
          {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ uris, offset: { position: index } }),
          }
        );
        if (res.status === 403) {
          setError("La lecture nécessite un compte Spotify Premium.");
        } else if (!res.ok && res.status !== 204) {
          setError("Impossible de lancer la lecture — réessaie.");
        }
      } catch {
        setError("Impossible de contacter Spotify.");
      }
    },
    []
  );

  const value: PlayerContextValue = {
    ready,
    error,
    current,
    paused,
    positionMs,
    playContext,
    togglePlay: () => playerRef.current?.togglePlay(),
    next: () => playerRef.current?.nextTrack(),
    prev: () => playerRef.current?.previousTrack(),
    seek: (ms) => {
      setPositionMs(ms);
      playerRef.current?.seek(ms);
    },
    setVolume: (v) => playerRef.current?.setVolume(v),
    activePlaylistId,
  };

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}
