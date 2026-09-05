import type { Metadata } from "next";
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

export const metadata: Metadata = {
  description:
    "Neb — one shared AI workspace per team. Rooms with memory that compounds, agents that route per message, and parallel questions that merge into one answer.",
  title: {
    default: "Neb — the shared AI workspace",
    template: "%s · Neb",
  },
};

const RootLayout = ({ children }: { children: React.ReactNode }) => (
  <html lang="en">
    <body className={`${sans.variable} ${code.variable}`}>{children}</body>
  </html>
);

export default RootLayout;
