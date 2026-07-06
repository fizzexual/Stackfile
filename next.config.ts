import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A custom Node server (server.js) handles WebDAV and sets security headers,
  // so we don't use Next's standalone output.
  poweredByHeader: false,
};

export default nextConfig;
