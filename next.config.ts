import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The transcript helper runs BotGuard/jsdom in Node and should stay a native
  // server dependency rather than being folded into the Next.js route bundle.
  serverExternalPackages: ["get-youtube-transcript"],
};

export default nextConfig;
