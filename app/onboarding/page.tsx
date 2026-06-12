"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function OnboardingPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    });
    if (res.ok) {
      router.push("/");
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Une erreur est survenue");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center pt-16">
      <div className="card w-full max-w-md p-8">
        <p className="eyebrow">Dernière étape</p>
        <h1 className="font-display mt-3 text-3xl font-semibold tracking-tight">
          Choisis ton <span className="gold-text">identité</span>
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Ton compte Pulse est lié à ton Spotify. Il ne manque qu&apos;un nom d&apos;utilisateur —
          c&apos;est lui que verront les auditeurs de tes playlists.
        </p>

        <form onSubmit={submit} className="mt-6">
          <label htmlFor="username" className="mb-1.5 block text-sm font-medium">
            Nom d&apos;utilisateur
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted">
              @
            </span>
            <input
              id="username"
              className="input input-prefixed"
              placeholder="ton_pseudo"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              minLength={3}
              maxLength={20}
              pattern="[a-zA-Z0-9_]+"
              autoFocus
              required
            />
          </div>
          <p className="mt-1.5 text-xs text-muted">3 à 20 caractères : lettres, chiffres, _</p>

          {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary mt-6 w-full justify-center"
          >
            {loading ? "Création…" : "Entrer dans Pulse"}
          </button>
        </form>
      </div>
    </div>
  );
}
