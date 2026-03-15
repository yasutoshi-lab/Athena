import type { Metadata } from "next";
import "./globals.css";
import ToastContainer from "@/components/ToastContainer";

export const metadata: Metadata = {
  title: "Athena — 因果推論システム",
  description: "AIが多角的に推論し、知識グラフとして可視化するシステム",
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;600;700&family=JetBrains+Mono:wght@300;400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ToastContainer />
        {children}
      </body>
    </html>
  );
}
