"use client";

import { useEffect } from "react";
import AOS from "aos";
import "aos/dist/aos.css";
import "./globals.css"; // Tailwind CSS 포함

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // 페이지 이동 시에도 AOS가 정상 작동하도록 설정
    AOS.init({
      duration: 1000,
      once: true,
    });

    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) AOS.refresh();
    };
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
