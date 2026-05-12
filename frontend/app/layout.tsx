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
        {/* [1] 네이버 사이트 소유 확인: 네이버 서치어드바이저 등록을 위한 인증 키입니다. */}
        <meta name="naver-site-verification" content="ae097be7b20202252666741b4564a783c1506cc0" />

        {/* [2] 검색 결과 제목: 네이버에 '그라운드코퍼레이션' 검색 시 파란색 큰 글씨로 나오는 제목입니다. */}
        <title>그라운드코퍼레이션 | 공식 홈페이지</title>

        {/* [3] 검색 결과 설명: 제목 아래에 회색 글씨로 나오는 요약 설명 문구입니다. */}
        <meta name="description" content="혁신적인 스포츠 솔루션을 제공하는 그라운드코퍼레이션의 공식 웹사이트입니다." />

        {/* [4] 검색 로봇 수집 허용: 로봇이 이 페이지의 정보를 긁어가도록 허용합니다. */}
        <meta name="robots" content="index,follow" />

        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}