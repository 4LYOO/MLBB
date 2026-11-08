import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { maybeAutoSync } from "@/lib/server/jobs";

export const metadata: Metadata = {
  title: { default: "MLBB Companion", template: "%s · MLBB Companion" },
  description: "Analyse de la méta, simulateur de draft, builds et suivi de progression pour Mobile Legends: Bang Bang.",
  applicationName: "MLBB Companion",
  appleWebApp: { capable: true, title: "MLBB", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#05060d",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  try {
    maybeAutoSync(); // synchronisation mlbb.io en arrière-plan si les données sont anciennes
  } catch {
    /* jamais bloquant */
  }
  return (
    <html lang="fr">
      <body className="font-sans antialiased">
        <div className="liquid-bg" aria-hidden />
        <Sidebar />
        <CommandPalette />
        <main className="mx-auto max-w-[1400px] px-3 pb-[calc(env(safe-area-inset-bottom)+6.5rem)] pt-3 sm:px-5 lg:ml-72 lg:px-8 lg:pb-10 lg:pt-8">{children}</main>
      </body>
    </html>
  );
}
