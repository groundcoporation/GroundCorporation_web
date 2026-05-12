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

        {/* [5] 오픈 그래프(Open Graph): 카카오톡, 페이스북 등 SNS에 링크 공유 시 보여질 정보입니다. */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.groundcorporation.com" />
        <meta property="og:title" content="그라운드코퍼레이션 | 공식 홈페이지" />
        <meta property="og:description" content="혁신적인 스포츠 솔루션을 제공하는 그라운드코퍼레이션의 공식 웹사이트입니다." />
        {/* 아래 주소는 public/resource/image/logo_ft.png 경로를 웹 주소로 변환한 것입니다. */}
        <meta property="og:image" content="https://www.groundcorporation.com/resource/image/logo_ft.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        {/* [추가 1] 오픈 그래프 가이드 권장: 로봇이 이미지를 더 잘 이해하도록 돕는 텍스트입니다. */}
        <meta property="og:image:alt" content="그라운드코퍼레이션 공식 로고" />

        {/* [6] 트위터 카드: 트위터(X)에서 링크 공유 시 보여질 정보입니다. */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="그라운드코퍼레이션 | 공식 홈페이지" />
        <meta name="twitter:description" content="혁신적인 스포츠 솔루션을 제공하는 그라운드코퍼레이션의 공식 웹사이트입니다." />
        <meta name="twitter:image" content="https://www.groundcorporation.com/resource/image/logo_ft.png" />
        {/* [추가 2] 오픈 그래프 가이드 권장: 트위터 카드용 도메인 정보입니다. */}
        <meta name="twitter:domain" content="그라운드코퍼레이션" />

        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}