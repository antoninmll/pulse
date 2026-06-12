"use client";

import { useEffect, useRef } from "react";

/**
 * Visualiseur de la barre de lecture.
 * Le flux Spotify est chiffré (DRM) : impossible d'analyser le vrai signal.
 * On anime donc des barres de façon organique (superposition de sinusoïdes
 * + impulsions pseudo-aléatoires) calées sur l'état lecture/pause.
 */
export default function Visualizer({ playing }: { playing: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playingRef = useRef(playing);

  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let width = 0;
    let height = 0;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // Phases et vitesses propres à chaque barre pour un rendu non mécanique
    const N = 48;
    const phases = Array.from({ length: N }, () => Math.random() * Math.PI * 2);
    const speeds = Array.from({ length: N }, () => 1.6 + Math.random() * 2.2);
    const levels = new Float32Array(N); // niveau lissé par barre

    let beat = 0; // impulsion « basse » globale
    let nextBeatAt = 0;

    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      const t = now / 1000;

      if (playingRef.current) {
        if (now >= nextBeatAt) {
          beat = 1;
          nextBeatAt = now + 380 + Math.random() * 320; // pseudo-tempo 90-170 bpm
        }
        beat *= 0.92;
      }

      ctx.clearRect(0, 0, width, height);
      const barW = width / N;

      for (let i = 0; i < N; i++) {
        const target = playingRef.current
          ? 0.18 +
            0.32 * Math.abs(Math.sin(t * speeds[i] + phases[i])) +
            0.2 * Math.abs(Math.sin(t * 0.7 + i * 0.4)) +
            beat * 0.3 * Math.exp(-Math.abs(i - N / 2) / (N / 4))
          : 0.05;
        // Lissage : montée rapide, descente douce
        levels[i] += (target - levels[i]) * (target > levels[i] ? 0.3 : 0.08);

        const h = Math.max(1.5, levels[i] * height);
        const x = i * barW + barW * 0.22;
        ctx.fillStyle = `rgba(227, 179, 65, ${0.10 + levels[i] * 0.25})`;
        ctx.beginPath();
        ctx.roundRect(x, height - h, barW * 0.56, h, 2);
        ctx.fill();
      }
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-x-3 bottom-0 h-full w-[calc(100%-1.5rem)]"
      aria-hidden
    />
  );
}
