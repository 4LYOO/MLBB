import type { NextConfig } from "next";

/**
 * Export statique pour GitHub Pages.
 * NEXT_PUBLIC_BASE_PATH = « /<nom-du-dépôt> » en production (défini par le workflow), vide en local.
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
