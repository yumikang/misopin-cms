import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "미소핀의원 CMS",
  description: "미소핀의원 컨텐츠 관리 시스템",
  icons: {
    icon: "/img/misopin-temporary-logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
