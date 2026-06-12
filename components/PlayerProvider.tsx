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
import { useSettings } from "./SettingsProvider";

export type CurrentTrack = {
  uri: string;
  name: string;
  artists: string;
  albumArt: string | null;
  durationMs: number;
};

export type RepeatMode = "off" | "context" | "track";

type PlayerContextValue = {
  ready: boolean;
  error: string | null;
  current: CurrentTrack | null;
  paused: boolean;
  positionMs: number;
  /**
   * Lance la lecture d'une liste d'uris à partir d'un index.
   * playlistId null = lecture libre (hors playlist Pulse, pas de stats enregistrées).
   */
  playContext: (
    playlistId: number | null,
    uris: string[],
    index: number,
    options?: { shuffle?: boolean }
  ) => Promise<void>;
  togglePlay: () => void;
  next: () => void;
  prev: () => void;
  seek: (ms: number) => void;
  /** Volume 0–1, persisté dans le compte. */
  volume: number;
  setVolume: (v: number) => void;
  repeatMode: RepeatMode;
  cycleRepeat: () => void;
  shuffle: boolean;
  toggleShuffle: () => void;
  /** id du contexte playlist en cours (pour surligner le morceau actif) */
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

const REPEAT_ORDER: RepeatMode[] = ["off", "context", "track"];

export function PlayerProvider({
  enabled,
  children,
}: {
  enabled: boolean;
  children: ReactNode;
}) {
  const { settings, update: updateSettings } = useSettings();
  const playerRef = useRef<SpotifyPlayer | null>(null);
  const deviceIdRef = useRef<string | null>(null);
  const contextRef = useRef<{ playlistId: number } | null>(null);
  const lastRecordedUriRef = useRef<string | null>(null);
  const initialVolumeRef = useRef(settings.volume);

  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState<CurrentTrack | null>(null);
  const [paused, setPaused] = useState(true);
  const [positionMs, setPositionMs] = useState(0);
  const [activePlaylistId, setActivePlaylistId] = useState<number | null>(null);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>("off");
  const [shuffle, setShuffle] = useState(false);

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
        volume: initialVolumeRef.current,
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
        setRepeatMode(REPEAT_ORDER[state.repeat_mode] ?? "off");
        setShuffle(state.shuffle);
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

  // MediaSession API — affiche le titre, artiste et pochette dans le lecteur OS (iOS/Android)
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;

    if (!current) {
      navigator.mediaSession.metadata = null;
      return;
    }

    const artwork: MediaImage[] = current.albumArt
      ? [
          { src: current.albumArt, sizes: "300x300", type: "image/jpeg" },
          { src: current.albumArt, sizes: "512x512", type: "image/jpeg" },
        ]
      : [];

    navigator.mediaSession.metadata = new MediaMetadata({
      title: current.name,
      artist: current.artists,
      album: "Pulse",
      artwork,
    });

    navigator.mediaSession.playbackState = paused ? "paused" : "playing";
  }, [current, paused]);

  // iOS : alimente le « Now Playing » (Dynamic Island / écran verrouillé).
  // WebKit n'affiche souvent rien tant que la durée/position ne sont pas
  // communiquées via setPositionState, même si les métadonnées sont définies.
  useEffect(() => {
    if (!("mediaSession" in navigator) || !current) return;
    if (typeof navigator.mediaSession.setPositionState !== "function") return;
    const duration = current.durationMs / 1000;
    if (!duration || !Number.isFinite(duration)) return;
    try {
      navigator.mediaSession.setPositionState({
        duration,
        playbackRate: 1,
        position: Math.min(positionMs / 1000, duration),
      });
    } catch {
      // ignore — certaines valeurs transitoires peuvent être rejetées
    }
  }, [current, positionMs]);

  // MediaSession action handlers
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;

    const player = playerRef.current;
    if (!player) return;

    const actions: [MediaSessionAction, MediaSessionActionHandler][] = [
      ["play", () => player.togglePlay()],
      ["pause", () => player.togglePlay()],
      ["previoustrack", () => player.previousTrack()],
      ["nexttrack", () => player.nextTrack()],
      [
        "seekto",
        (details) => {
          if (details.seekTime != null) {
            const ms = details.seekTime * 1000;
            setPositionMs(ms);
            player.seek(ms);
          }
        },
      ],
    ];

    for (const [action, handler] of actions) {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch {
        // Some actions may not be supported
      }
    }

    return () => {
      for (const [action] of actions) {
        try {
          navigator.mediaSession.setActionHandler(action, null);
        } catch {
          // ignore
        }
      }
    };
  }, [ready]);

  /** Appel direct à l'API Web Spotify sur le device du lecteur. */
  const playerApi = useCallback(async (path: string, method = "PUT"): Promise<Response | null> => {
    try {
      const { accessToken } = await getToken();
      const deviceId = deviceIdRef.current;
      if (!deviceId) return null;
      const sep = path.includes("?") ? "&" : "?";
      return await fetch(`https://api.spotify.com/v1/me/player${path}${sep}device_id=${deviceId}`, {
        method,
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    } catch {
      return null;
    }
  }, []);

  const playContext = useCallback(
    async (
      playlistId: number | null,
      uris: string[],
      index: number,
      options?: { shuffle?: boolean }
    ) => {
      setError(null);
      // iOS Safari : débloque l'élément audio interne du SDK. DOIT être appelé
      // de façon synchrone dans le geste utilisateur (avant tout await), sinon
      // iOS coupe la lecture au démarrage et l'état du lecteur ne remonte pas.
      try {
        playerRef.current?.activateElement();
      } catch {
        // sans effet hors iOS
      }
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

        let queue = uris;
        let startIndex = index;
        if (options?.shuffle) {
          // Mélange Fisher-Yates côté client : fiable même avec une liste d'uris
          queue = [...uris];
          for (let i = queue.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [queue[i], queue[j]] = [queue[j], queue[i]];
          }
          startIndex = 0;
        }

        contextRef.current = playlistId !== null ? { playlistId } : null;
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
            body: JSON.stringify({ uris: queue, offset: { position: startIndex } }),
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

  const cycleRepeat = useCallback(() => {
    const next = REPEAT_ORDER[(REPEAT_ORDER.indexOf(repeatMode) + 1) % REPEAT_ORDER.length];
    setRepeatMode(next); // optimiste, confirmé par player_state_changed
    playerApi(`/repeat?state=${next}`).catch(() => {});
  }, [repeatMode, playerApi]);

  const toggleShuffle = useCallback(() => {
    const next = !shuffle;
    setShuffle(next);
    playerApi(`/shuffle?state=${next}`).catch(() => {});
  }, [shuffle, playerApi]);

  const setVolume = useCallback(
    (v: number) => {
      playerRef.current?.setVolume(v);
      updateSettings({ volume: v });
    },
    [updateSettings]
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
    volume: settings.volume,
    setVolume,
    repeatMode,
    cycleRepeat,
    shuffle,
    toggleShuffle,
    activePlaylistId,
  };

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}
