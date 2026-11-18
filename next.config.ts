import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  // Postgres driver stays a server-side Node dependency.
  serverExternalPackages: ["pg", "@prisma/adapter-pg"],
};

export default config;
