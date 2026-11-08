import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MLBB Companion",
    short_name: "MLBB",
    description: "Méta, draft, builds et progression pour Mobile Legends: Bang Bang",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#05060d",
    theme_color: "#05060d",
    lang: "fr",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
