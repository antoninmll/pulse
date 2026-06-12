"use client";

import { useEffect, useRef } from "react";

/**
 * Visualiseur de spectre audio simulé (Égaliseur).
 * - Affiche une série de barres verticales réagissant de manière dynamique et fluide.
 * - Basses à gauche (mouvements amples et rythmés par un beat).
 * - Médiums au centre (fluctuations mélodiques).
 * - Aiguës à droite (micro-vibrations rapides et bruitées).
 * - Moteur physique basé sur le delta de temps (dt) pour une fluidité parfaite à 60Hz, 120Hz et plus.
 */
export default function Visualizer({ playing, theme }: { playing: boolean; theme: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playingRef = useRef(playing);
  const colorRef = useRef("140, 140, 140");

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

    const N = 60; // Nombre de barres dans le spectre
    const heights = new Float32Array(N);
    let lastTime = performance.now();
    let beatIntensity = 0;
    let nextBeatAt = 0;
    let level = 0; // 0 quand sur pause, 1 en lecture

    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      
      // Calcul du delta de temps (dt) en secondes, plafonné à 100ms
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      const t = now / 1000;

      // Gestion du beat de basse (rythme simulé à ~125 BPM)
      if (playingRef.current) {
        if (now >= nextBeatAt) {
          beatIntensity = 1.0;
          // Intervalle de beat : ~420ms à ~520ms pour un effet organique non métronomique
          nextBeatAt = now + 400 + Math.random() * 120;
        }
      }
      
      // Amortissement du beat
      beatIntensity *= Math.exp(-dt * 6.0);

      // Niveau global amorti (pour démarrer / arrêter proprement)
      const targetLevel = playingRef.current ? 1.0 : 0.0;
      level += (targetLevel - level) * (1 - Math.exp(-dt * 4.5));

      ctx.clearRect(0, 0, width, height);

      // Paramétrage géométrique des barres
      const gap = 2.5;
      const barWidth = Math.max(1, (width - (N - 1) * gap) / N);

      for (let i = 0; i < N; i++) {
        const u = i / (N - 1); // 0 à 1 (gauche à droite)

        // 1. Composante Basses (à gauche) : gros battements, décroissance rapide en s'éloignant
        const bass = (beatIntensity * 1.05 + (Math.sin(t * 3.0 + i * 0.1) * 0.18 + 0.18)) * Math.exp(-u * 3.2);

        // 2. Composante Médiums (au centre) : vagues mélodiques harmonieuses
        const mids = (Math.sin(t * 6.0 - i * 0.12) * 0.22 + Math.sin(t * 3.5 + i * 0.08) * 0.15 + 0.2) 
                     * Math.exp(-Math.pow(u - 0.45, 2) * 7.0);

        // 3. Composante Aiguës (à droite) : micro-oscillations frénétiques et bruitées
        const treble = ((Math.random() * 0.2) + (Math.sin(t * 18.0 + i * 0.2) * 0.08 + 0.08)) 
                       * Math.pow(u, 1.5);

        // Somme des composantes, modulée par le niveau de lecture
        const targetAmp = (bass + mids + treble) * level * 0.95;

        // Hauteur de barre ciblée (pixels)
        const maxBarH = height * 0.75;
        const targetH = Math.max(2, targetAmp * maxBarH);

        // Constante d'amortissement selon la fréquence pour adoucir le mouvement (effet moyenne mobile plus lent)
        const ease = u < 0.3 ? 3.8 : (u < 0.7 ? 5.2 : 7.5);
        
        // Mise à jour amortie et fluide de la hauteur
        heights[i] += (targetH - heights[i]) * (1 - Math.exp(-dt * ease));

        // Rendu de la barre
        const h = heights[i];
        const x = i * (barWidth + gap);
        const y = height - h;

        // Dégradé de couleur selon le thème courant
        const grad = ctx.createLinearGradient(x, y, x, height);
        grad.addColorStop(0, `rgba(${colorRef.current}, 0.42)`); // Haut de la barre (brillant)
        grad.addColorStop(1, `rgba(${colorRef.current}, 0.08)`); // Bas de la barre (blended)

        ctx.fillStyle = grad;
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(x, y, barWidth, h, 1.5);
        } else {
          ctx.rect(x, y, barWidth, h);
        }
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
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden
    />
  );
}
