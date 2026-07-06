import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emit a self-contained server build for lean Docker images / self-hosting.
  output: "standalone",
};

export default nextConfig;
