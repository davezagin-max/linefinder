import type { NextConfig } from "next";

/**
 * Two builds:
 * - Full app (default): Next.js server with API routes (`route.server.ts`)
 *   backed by Postgres.
 * - Static demo for GitHub Pages (DEMO_STATIC=1): plain HTML/JS export,
 *   API routes left out, recommendations computed in the browser.
 */
const demo = process.env.DEMO_STATIC === "1";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const config: NextConfig = {
  reactStrictMode: true,
  // Postgres driver stays a server-side Node dependency.
  serverExternalPackages: ["pg", "@prisma/adapter-pg"],
  pageExtensions: demo ? ["tsx", "ts"] : ["tsx", "ts", "server.ts"],
  ...(demo ? { output: "export" as const, trailingSlash: true, basePath, images: { unoptimized: true } } : {}),
};

export default config;
