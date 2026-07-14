import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cloudflare tunnel + custom domain (dev server)
  allowedDevOrigins: [
    "thekoharuproject.com",
    "www.thekoharuproject.com",
    "127.0.0.1",
    "localhost",
  ],
  experimental: {
    proxyClientMaxBodySize: "200mb",
  },
};

export default nextConfig;
