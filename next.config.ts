import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Spotify impose une redirection vers 127.0.0.1 (et non localhost) : on autorise
  // explicitement cette origine pour les ressources de développement de Next.js.
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
