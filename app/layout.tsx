import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "prateek-design-system/tokens.css";
import "prateek-design-system/components.css";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Excuse generator",
  description: "Random, funny excuses for your leave and work-from-home updates. Send one now or schedule it.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
