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
import type { UserSettings } from "@/lib/db";

type SettingsContextValue = {
  settings: UserSettings;
  /** Met à jour localement puis persiste côté serveur (débouncé). */
  update: (partial: Partial<UserSettings>) => void;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings doit être utilisé sous <SettingsProvider>");
  return ctx;
}

export function SettingsProvider({
  initial,
  children,
}: {
  initial: UserSettings;
  children: ReactNode;
}) {
  const [settings, setSettings] = useState<UserSettings>(initial);
  const pendingRef = useRef<Partial<UserSettings>>({});
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Applique le thème sur <html> (le rendu serveur le pose déjà : pas de flash)
  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme;
  }, [settings.theme]);

  const update = useCallback((partial: Partial<UserSettings>) => {
    setSettings((s) => ({ ...s, ...partial }));
    pendingRef.current = { ...pendingRef.current, ...partial };
    if (timerRef.current) clearTimeout(timerRef.current);
    // Débounce : le slider de volume envoie beaucoup d'updates d'affilée
    timerRef.current = setTimeout(() => {
      const toSend = pendingRef.current;
      pendingRef.current = {};
      fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: toSend }),
      }).catch(() => {});
    }, 600);
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, update }}>{children}</SettingsContext.Provider>
  );
}
