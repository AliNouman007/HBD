import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Birthday World",
  description: "A continuous birthday journey through a warm, sunlit world.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
