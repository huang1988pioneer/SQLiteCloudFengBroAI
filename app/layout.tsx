import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "鋒兄 AI 訂閱管理",
  description: "SQLiteCloud powered subscription workspace for FengBro AI.",
  icons: {
    icon: "/icon.svg",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
