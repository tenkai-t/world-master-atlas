import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "世界マスター — WORLD MASTER",
  description: "地図から学ぶ世界地理ゲーム",
  manifest: "/manifest.webmanifest",
  icons: { icon: [{ url: "/icons/atlas-v1/favicon-32.png", sizes: "32x32", type: "image/png" }, { url: "/icons/atlas-v1/favicon.ico" }], apple: [{ url: "/icons/atlas-v1/apple-touch-icon.png", sizes: "180x180" }] },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="antialiased">{children}</body>
    </html>
  );
}
