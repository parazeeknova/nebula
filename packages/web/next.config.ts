import path from "node:path";

import { config } from "dotenv";
import type { NextConfig } from "next";

// Single env file for the whole repo: load the monorepo-root
// `.env.local` before Next reads env. Existing shell env wins
// (dotenv never overrides), and Next still inlines NEXT_PUBLIC_*
// at build time from process.env as usual.
config({
  path: path.join(import.meta.dirname, "..", "..", ".env.local"),
});

const nextConfig: NextConfig = {
  reactCompiler: true,
  typedRoutes: true,
};

export default nextConfig;
