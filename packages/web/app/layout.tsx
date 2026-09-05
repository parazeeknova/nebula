import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Poppins } from "next/font/google";

import "./globals.css";

/**
 * Poppins across all UI type (body + display), self-hosted via
 * next/font. JetBrains Mono stays for technical micro-labels
 * (timestamps, badges, tool chips).
 */
const sans = Poppins({
  subsets: ["latin"],
  variable: "--neb-body",
  weight: ["400", "500", "600", "700", "800"],
});

const code = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--neb-mono",
  weight: ["400", "500", "600"],
});

const DESCRIPTION =
  "Neb is a shared AI workspace for teams, built on SpacetimeDB for fully real-time, multiplayer chat. One chat for a whole company, where every room holds both people and custom AI agents — a research bot, a marketing bot, whatever the team sets up. Talk in a room, tag an agent or prompt normally, and it starts a thread. The system decides on its own whether to run a tool call through an agent or answer from what the room already knows, because every room keeps its own compounding memory of everything that has ever happened in it. When two people ask about the same thing from different angles at once, Neb streams both explorations live for the whole room to watch, then merges them into one synthesized answer. It is one shared brain that gets smarter the more the team uses it — instead of five people asking the same question in five separate private ChatGPT tabs where the context dies.";

const metadataBase = new URL(
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001"
);

export const metadata: Metadata = {
  alternates: {
    canonical: "/",
  },
  applicationName: "Nebula",
  authors: [{ name: "Nebula" }],
  category: "productivity",
  creator: "Nebula",
  description: DESCRIPTION,
  formatDetection: { email: false, telephone: false },
  icons: {
    apple: "/nebula.svg",
    icon: "/nebula.svg",
    shortcut: "/nebula.svg",
  },
  keywords: [
    "shared AI workspace",
    "AI agents for teams",
    "multiplayer AI chat",
    "real-time collaboration",
    "team AI memory",
    "AI research assistant",
    "Slack alternative with AI",
    "Discord alternative for work",
    "SpacetimeDB",
    "shared brain for teams",
  ],
  metadataBase,
  openGraph: {
    description: DESCRIPTION,
    images: [{ url: "/nebula.svg" }],
    locale: "en_US",
    siteName: "Nebula",
    title: "Nebula — the shared AI workspace for teams",
    type: "website",
    url: "/",
  },
  robots: {
    follow: true,
    index: true,
  },
  title: {
    default: "Nebula — the shared AI workspace for teams",
    template: "%s · Nebula",
  },
  twitter: {
    card: "summary",
    description: DESCRIPTION,
    images: ["/nebula.svg"],
    title: "Nebula — the shared AI workspace for teams",
  },
};

export const viewport: Viewport = {
  colorScheme: "dark",
  initialScale: 1,
  themeColor: "#206EE3",
  width: "device-width",
};

const RootLayout = ({ children }: { children: React.ReactNode }) => (
  <html lang="en">
    <body className={`${sans.variable} ${code.variable}`}>{children}</body>
  </html>
);

export default RootLayout;
