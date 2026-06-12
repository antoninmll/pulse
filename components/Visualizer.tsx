"use client";

import { useEffect, useRef } from "react";

/**
 * Visualiseur de la barre de lecture : plusieurs traits de vague qui ondulent
 * derrière le contenu, en opacité faible pour ne pas gêner la lecture.
 *
 * Le flux Spotify est chiffré (DRM) : on ne peut pas analyser le vrai signal.
 * Le mouvement est donc synthétique — superposition de sinusoïdes + une
 * enveloppe « beat » pseudo-aléatoire pour donner l'impression de réagir.
 */
export default function Visualizer({ playing, theme }: { playing: boolean; theme: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playingRef = useRef(playing);
  const colorRef = useRef("227, 179, 65");

  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  // Lit la couleur d'accent du thème courant et la convertit en « r, g, b »
  useEffect(() => {
    const hex = getComputedStyle(document.documentElement)
      .getPropertyValue("--gold")
      .trim();
    const m = hex.match(/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
    if (m) {
      colorRef.current = `${parseInt(m[1], 16)}, ${parseInt(m[2], 16)}, ${parseInt(m[3], 16)}`;
    }
  }, [theme]);

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

    // Couches de vagues : chacune a sa fréquence, vitesse, phase et opacité.
    const LAYERS = [
      { freq: 1.1, speed: 0.6, phase: 0, amp: 0.5, op: 0.16 },
      { freq: 1.7, speed: -0.9, phase: 1.6, amp: 0.38, op: 0.13 },
      { freq: 2.4, speed: 1.25, phase: 3.1, amp: 0.3, op: 0.1 },
      { freq: 3.2, speed: -1.6, phase: 4.7, amp: 0.22, op: 0.08 },
    ];

    let env = 0; // enveloppe « beat » lissée
    let nextBeatAt = 0;
    let level = 0; // niveau global lissé (0 à l'arrêt, ~1 en lecture)

    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      const t = now / 1000;

      // Beat pseudo-aléatoire en lecture
      if (playingRef.current && now >= nextBeatAt) {
        env = 1;
        nextBeatAt = now + 360 + Math.random() * 360; // ~100–170 bpm
      }
      env *= 0.94;
      const target = playingRef.current ? 1 : 0;
      level += (target - level) * 0.05;

      ctx.clearRect(0, 0, width, height);
      const mid = height / 2;

      for (const L of LAYERS) {
        const amp = (height * 0.18 * L.amp) * (0.45 + 0.55 * level) * (1 + env * 0.6);
        ctx.beginPath();
        for (let x = 0; x <= width; x += 6) {
          const u = x / width;
          const y =
            mid +
            Math.sin(u * Math.PI * 2 * L.freq + t * L.speed + L.phase) * amp +
            Math.sin(u * Math.PI * 2 * (L.freq * 0.5) - t * L.speed * 0.7) * amp * 0.35;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `rgba(${colorRef.current}, ${L.op * (0.5 + 0.5 * level)})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
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
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden
    />
  );
}
