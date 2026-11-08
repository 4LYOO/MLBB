import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { CommandPalette } from "@/components/layout/CommandPalette";

export const metadata: Metadata = {
  title: { default: "MLBB Companion", template: "%s · MLBB Companion" },
  description: "Analyse de la méta, simulateur de draft, builds et suivi de progression pour Mobile Legends: Bang Bang.",
};

export const viewport: Viewport = { themeColor: "#0a0d1c", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen font-sans antialiased">
        <Sidebar />
        <CommandPalette />
        <main className="mx-auto max-w-[1400px] px-3 pb-24 pt-4 sm:px-5 lg:ml-64 lg:px-8 lg:pb-10 lg:pt-8">{children}</main>
      </body>
    </html>
  );
}
