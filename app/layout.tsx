import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "のりすごしアラーム",
  description: "疲れているあなたへ。数タップで安心の仮眠を。",
};

export const viewport: Viewport = {
  themeColor: "#0b1437",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" className="dark">
      <body className="min-h-screen bg-night text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
