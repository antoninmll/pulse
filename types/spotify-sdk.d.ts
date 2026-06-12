// Surface minimale du Spotify Web Playback SDK utilisée par l'app.

interface WebPlaybackTrack {
  uri: string;
  id: string | null;
  name: string;
  duration_ms: number;
  artists: { name: string }[];
  album: { name: string; images: { url: string }[] };
}

interface WebPlaybackState {
  paused: boolean;
  position: number;
  duration: number;
  /** 0 = off, 1 = playlist en boucle, 2 = titre en boucle */
  repeat_mode: 0 | 1 | 2;
  shuffle: boolean;
  track_window: {
    current_track: WebPlaybackTrack;
  };
}

interface SpotifyPlayer {
  connect(): Promise<boolean>;
  disconnect(): void;
  addListener(event: "ready" | "not_ready", cb: (data: { device_id: string }) => void): boolean;
  addListener(event: "player_state_changed", cb: (state: WebPlaybackState | null) => void): boolean;
  addListener(
    event:
      | "initialization_error"
      | "authentication_error"
      | "account_error"
      | "playback_error",
    cb: (data: { message: string }) => void
  ): boolean;
  getCurrentState(): Promise<WebPlaybackState | null>;
  togglePlay(): Promise<void>;
  previousTrack(): Promise<void>;
  nextTrack(): Promise<void>;
  seek(positionMs: number): Promise<void>;
  setVolume(volume: number): Promise<void>;
}

interface Window {
  onSpotifyWebPlaybackSDKReady?: () => void;
  Spotify?: {
    Player: new (options: {
      name: string;
      getOAuthToken: (cb: (token: string) => void) => void;
      volume?: number;
    }) => SpotifyPlayer;
  };
}
