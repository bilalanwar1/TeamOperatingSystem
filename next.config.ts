import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Avoid picking up a parent-folder lockfile as the Turbopack workspace root.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
