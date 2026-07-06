import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A custom Node server (server.js) handles WebDAV, so we don't use
  // Next's standalone output.
};

export default nextConfig;
