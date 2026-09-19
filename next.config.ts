import type { NextConfig } from "next";
import { hostname, networkInterfaces } from "node:os";

function devOrigins() {
  const origins = new Set<string>(["localhost", "127.0.0.1", "0.0.0.0", hostname().toLowerCase()]);

  for (const entries of Object.values(networkInterfaces())) {
    for (const entry of entries ?? []) {
      if (entry.family === "IPv4" && !entry.internal && !entry.address.startsWith("169.254.")) {
        origins.add(entry.address);
      }
    }
  }

  for (const value of (process.env.MARGIN_ALLOWED_DEV_ORIGINS ?? "").split(",")) {
    const origin = value.trim().toLowerCase();
    if (origin) origins.add(origin);
  }

  return [...origins];
}

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  allowedDevOrigins: devOrigins(),
  // The transcript helper runs BotGuard/jsdom in Node and should stay a native
  // server dependency rather than being folded into the Next.js route bundle.
  serverExternalPackages: ["get-youtube-transcript"],
};

export default nextConfig;
